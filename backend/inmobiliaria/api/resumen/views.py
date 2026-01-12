from datetime import date, timedelta, datetime, time

from django.utils import timezone
from django.db.models import Sum, Count, OuterRef, Exists, Min, Value, CharField
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, Concat

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from inmobiliaria.models import (
    Contrato, Pago, CuotaContrato,
    Reserva, SolicitudCliente
)
from inmobiliaria.permissions import IsAdmin


def _parse_date(s: str | None) -> date | None:
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


def _month_start(d: date) -> date:
    return date(d.year, d.month, 1)


def _as_float(x):
    if x is None:
        return 0.0
    try:
        return float(x)
    except Exception:
        return 0.0


def _dt_range(desde: date, hasta: date):
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(desde, time.min), tz)
    end = timezone.make_aware(datetime.combine(hasta + timedelta(days=1), time.min), tz)
    return start, end


def build_deudores(*, hasta: date, propiedad_id=None):
    hoy = timezone.localdate()

    qs = (
        CuotaContrato.objects
        .select_related("contrato", "contrato__propiedad", "contrato__comprador_arrendatario")
        .filter(
            pagada=False,
            contrato__tipo="arriendo",
            contrato__vigente=True,
            vencimiento__lt=hoy,
        )
    )

    if hasta:
        qs = qs.filter(vencimiento__lte=hasta)

    if propiedad_id:
        qs = qs.filter(contrato__propiedad_id=propiedad_id)

    qs = qs.annotate(
        cliente_nombre=Concat(
            "contrato__comprador_arrendatario__primer_nombre", Value(" "),
            "contrato__comprador_arrendatario__segundo_nombre", Value(" "),
            "contrato__comprador_arrendatario__primer_apellido", Value(" "),
            "contrato__comprador_arrendatario__segundo_apellido",
            output_field=CharField(),
        )
    )

    rows = (
        qs.values(
            "contrato_id",
            "contrato__propiedad_id",
            "contrato__propiedad__titulo",
            "contrato__comprador_arrendatario_id",
            "cliente_nombre",
            "contrato__comprador_arrendatario__rut",
        )
        .annotate(
            cuotas_vencidas=Count("id"),
            deuda_total=Sum("monto"),
            primera_vencida=Min("vencimiento"),
        )
        .order_by("-deuda_total")
    )

    out = []
    for r in rows[:50]:
        primera = r["primera_vencida"]
        dias_atraso = (hoy - primera).days if primera else 0

        out.append({
            "contrato_id": r["contrato_id"],
            "propiedad": {
                "id": r["contrato__propiedad_id"],
                "titulo": r["contrato__propiedad__titulo"],
            },
            "cliente": {
                "id": r["contrato__comprador_arrendatario_id"],
                "nombre": (r["cliente_nombre"] or "").strip(),
                "rut": r["contrato__comprador_arrendatario__rut"],
            },
            "cuotas_vencidas": r["cuotas_vencidas"],
            "deuda_total": _as_float(r["deuda_total"]),
            "primera_vencida": primera.isoformat() if primera else None,
            "dias_atraso": dias_atraso,
        })

    return out


class ReporteResumenAPIView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        hoy = timezone.localdate()

        desde = _parse_date(request.query_params.get("desde")) or _month_start(hoy)
        hasta = _parse_date(request.query_params.get("hasta")) or hoy

        if hasta < desde:
            desde, hasta = hasta, desde

        group = (request.query_params.get("group") or "day").lower()
        propiedad_id = request.query_params.get("propiedad_id")

        # ------------------------
        # Base querysets
        # ------------------------
        contratos_qs = Contrato.objects.select_related("propiedad").all()
        pagos_qs = Pago.objects.select_related("contrato", "contrato__propiedad").all()
        cuotas_qs = CuotaContrato.objects.select_related("contrato", "contrato__propiedad").all()

        reservas_qs = Reserva.objects.select_related("propiedad").all()
        solicitudes_qs = SolicitudCliente.objects.select_related("interesado").all()

        if propiedad_id:
            contratos_qs = contratos_qs.filter(propiedad_id=propiedad_id)
            pagos_qs = pagos_qs.filter(contrato__propiedad_id=propiedad_id)
            cuotas_qs = cuotas_qs.filter(contrato__propiedad_id=propiedad_id)

            # Reservas sí se pueden filtrar por propiedad
            reservas_qs = reservas_qs.filter(propiedad_id=propiedad_id)


        # ------------------------
        # KPI Contratos
        # ------------------------
        contratos_activos = contratos_qs.filter(vigente=True).count()
        contratos_finalizados = contratos_qs.filter(vigente=False).count()

        arriendos_activos = contratos_qs.filter(vigente=True, tipo="arriendo").count()
        ventas_activos = contratos_qs.filter(vigente=True, tipo="venta").count()

        # ------------------------
        # Pagos en periodo (DateField)
        # ------------------------
        pagos_periodo = pagos_qs.filter(fecha__range=(desde, hasta))

        pagos_periodo = pagos_periodo.annotate(
            es_cuota=Exists(CuotaContrato.objects.filter(pago_id=OuterRef("pk")))
        )

        total_ingresos = _as_float(pagos_periodo.aggregate(t=Sum("monto"))["t"])
        total_pagos = pagos_periodo.count()

        ingresos_ventas = _as_float(
            pagos_periodo.filter(contrato__tipo="venta").aggregate(t=Sum("monto"))["t"]
        )

        ingresos_arriendo_cuotas = _as_float(
            pagos_periodo.filter(contrato__tipo="arriendo", es_cuota=True).aggregate(t=Sum("monto"))["t"]
        )

        ingresos_arriendo_extras = _as_float(
            pagos_periodo.filter(contrato__tipo="arriendo", es_cuota=False).aggregate(t=Sum("monto"))["t"]
        )

        # ------------------------
        # Mora 
        # ------------------------
        vencidas = cuotas_qs.filter(
            contrato__tipo="arriendo",
            contrato__vigente=True,
            pagada=False,
            vencimiento__lt=hoy,
        )
        mora_count = vencidas.count()
        mora_total = _as_float(vencidas.aggregate(t=Sum("monto"))["t"])

        # Próximas a vencer (7 días)
        prox = cuotas_qs.filter(
            contrato__tipo="arriendo",
            contrato__vigente=True,
            pagada=False,
            vencimiento__gte=hoy,
            vencimiento__lte=hoy + timedelta(days=7),
        )
        prox_count = prox.count()
        prox_total = _as_float(prox.aggregate(t=Sum("monto"))["t"])

        # ------------------------
        # Top propiedades por ingresos en periodo
        # ------------------------
        top_propiedades = (
            pagos_periodo.values("contrato__propiedad_id", "contrato__propiedad__titulo")
            .annotate(total=Sum("monto"), pagos=Count("id"))
            .order_by("-total")[:10]
        )

        top_propiedades_out = [
            {
                "propiedad_id": x["contrato__propiedad_id"],
                "titulo": x["contrato__propiedad__titulo"],
                "total": _as_float(x["total"]),
                "pagos": x["pagos"],
            }
            for x in top_propiedades
        ]

        # ------------------------
        # Serie ingresos
        # ------------------------
        trunc_map = {
            "day": TruncDay("fecha"),
            "week": TruncWeek("fecha"),
            "month": TruncMonth("fecha"),
        }
        trunc = trunc_map.get(group, TruncDay("fecha"))

        serie = (
            pagos_periodo.annotate(periodo=trunc)
            .values("periodo")
            .annotate(total=Sum("monto"))
            .order_by("periodo")
        )

        serie_out = [
            {
                "periodo": (x["periodo"].date().isoformat() if hasattr(x["periodo"], "date") else str(x["periodo"])),
                "total": _as_float(x["total"]),
            }
            for x in serie
        ]

        # ------------------------
        #  Reservas & Solicitudes (por período)
        # ------------------------
        start_dt, end_dt = _dt_range(desde, hasta)

        # Reservas:
        reservas_periodo = reservas_qs.filter(fecha__gte=start_dt, fecha__lt=end_dt)
        reservas_total = reservas_periodo.count()
        reservas_por_estado = list(
            reservas_periodo.values("estado").annotate(count=Count("id")).order_by("estado")
        )

        # Solicitudes: por created_at
        solicitudes_periodo = solicitudes_qs.filter(created_at__gte=start_dt, created_at__lt=end_dt)
        solicitudes_total = solicitudes_periodo.count()
        solicitudes_por_estado = list(
            solicitudes_periodo.values("estado").annotate(count=Count("id")).order_by("estado")
        )

        # ------------------------
        # Deudores
        # ------------------------
        deudores_out = build_deudores(hasta=hasta, propiedad_id=propiedad_id)

        data = {
            "periodo": {"desde": desde.isoformat(), "hasta": hasta.isoformat(), "group": group},
            "kpis": {
                "contratos_activos": contratos_activos,
                "contratos_finalizados": contratos_finalizados,
                "arriendos_activos": arriendos_activos,
                "ventas_activos": ventas_activos,

                "pagos_total": total_pagos,
                "ingresos_total": total_ingresos,

                "ingresos_ventas": ingresos_ventas,
                "ingresos_arriendo_cuotas": ingresos_arriendo_cuotas,
                "ingresos_arriendo_extras": ingresos_arriendo_extras,
            },
            "mora": {
                "vencidas_count": mora_count,
                "vencidas_total": mora_total,
                "proximas_7d_count": prox_count,
                "proximas_7d_total": prox_total,
            },
            "top_propiedades": top_propiedades_out,
            "serie_ingresos": serie_out,
            "deudores": deudores_out,


            "reservas": {
                "total": reservas_total,
                "por_estado": reservas_por_estado,   
            },
            "solicitudes": {
                "total": solicitudes_total,
                "por_estado": solicitudes_por_estado,  
            },
        }

        return Response(data)
