from django.db.models import Sum, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from datetime import date, datetime, timedelta
from django.utils.dateparse import parse_date

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import IsAdminUser

from inmobiliaria.models import Propietario, Propiedad, SolicitudCliente, Reserva, Pago, Contrato, Interesado
from inmobiliaria.permisssions_roles import IsAdmin
from inmobiliaria.utils import liberar_reservas_vencidas


from .serializers import *
from inmobiliaria.serializers import SolicitudClienteSerializer, ReservaSerializer
import logging

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated, IsAdmin])
def admin_resumen(request):
    hoy = timezone.localdate()

    propiedades_por_aprobar = Propiedad.objects.filter(
        estado_aprobacion__in=["pendiente", "en_revision"]
    ).count()

    reservas_activas = Reserva.objects.filter(
        activa=True,
        expires_at__gt=timezone.now(),
    ).count()

    solicitudes_nuevas = SolicitudCliente.objects.filter(
        estado="nueva"
    ).count()

    pagos_mes = (
        Pago.objects.filter(
            fecha__year=hoy.year,
            fecha__month=hoy.month,
        ).aggregate(total=Sum("monto"))["total"]
        or 0
    )

    data = {
        "total_propiedades": Propiedad.objects.count(),
        "total_propietarios": Propietario.objects.count(),
        "propiedades_por_aprobar": propiedades_por_aprobar,
        "reservas_activas": reservas_activas,
        "solicitudes_nuevas": solicitudes_nuevas,
        "pagos_mes": pagos_mes,
    }
    return Response(data)

# PROPIETARIO
class AdminPropietarioListCreateView(generics.ListCreateAPIView):
    queryset = Propietario.objects.all().order_by('primer_apellido', 'primer_nombre')
    serializer_class = AdminPropietarioSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
class AdminPropietarioRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Propietario.objects.all().order_by('primer_apellido', 'primer_nombre')
    serializer_class = AdminPropietarioSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


# PROPIEDAD
from inmobiliaria.models import Reserva

class AdminPropiedadListCreateView(generics.ListCreateAPIView):
    serializer_class = AdminPropiedadSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # 0) sincroniza vencidas antes de listar
        Reserva.expirar_reservas_y_sync_estado()

        return (
            Propiedad.objects
            .select_related('propietario')
            .all()
            .order_by('-id')
        )




class AdminPropiedadRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    queryset = Propiedad.objects.select_related('propietario').all()
    serializer_class = AdminPropiedadSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


# CRUD
User = get_user_model()

@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def admin_usuarios_list(request):
    if request.method == "GET":
        rol = (request.GET.get("rol") or "TODOS").strip().upper()
        search = (request.GET.get("search") or "").strip()

        qs = User.objects.all().order_by("-id")

        if rol != "TODOS":
            qs = qs.filter(rol=rol)

        if search:
            search_l = search.lower()

            emails_perfiles = set(
                Propietario.objects.filter(
                    Q(email__icontains=search_l)
                    | Q(rut__icontains=search_l)
                    | Q(primer_nombre__icontains=search_l)
                    | Q(primer_apellido__icontains=search_l)
                    | Q(segundo_nombre__icontains=search_l)
                    | Q(segundo_apellido__icontains=search_l)
                ).values_list("email", flat=True)
            )

            emails_perfiles |= set(
                Interesado.objects.filter(
                    Q(email__icontains=search_l)
                    | Q(rut__icontains=search_l)
                    | Q(primer_nombre__icontains=search_l)
                    | Q(primer_apellido__icontains=search_l)
                    | Q(segundo_nombre__icontains=search_l)
                    | Q(segundo_apellido__icontains=search_l)
                ).values_list("email", flat=True)
            )

            emails_perfiles = [e.strip().lower() for e in emails_perfiles if e]

            qs = qs.filter(
                Q(email__icontains=search_l)
                | Q(username__icontains=search_l)
                | Q(email__in=emails_perfiles)
            )

        return Response(AdminUsuarioSerializer(qs, many=True).data)

    # ---- POST: crear usuario + perfil ----
    ser = AdminUsuarioCreateSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    user = ser.save()
    return Response(
        AdminUsuarioSerializer(user).data,
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET", "PUT"])
@permission_classes([IsAdminUser])
def admin_usuario_detail(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "No encontrado"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "GET":
        return Response(AdminUsuarioSerializer(user).data, status=status.HTTP_200_OK)

    old_email = (user.email or "").strip().lower()
    old_rol = (getattr(user, "rol", "") or "").upper()

    ser = AdminUsuarioUpdateSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    data = ser.validated_data

    # -------- 1) Cuenta --------
    if "email" in data:
        new_email = (data["email"] or "").strip().lower()
        user.email = new_email
        user.username = new_email
    else:
        new_email = old_email

    if "rol" in data:
        user.rol = data["rol"]

    if "is_active" in data:
        user.is_active = data["is_active"]

    if "aprobado" in data:
        user.aprobado = data["aprobado"]

    new_rol = (getattr(user, "rol", "") or "").upper()

    with transaction.atomic():
        user.save()

        # -------- 2) Si cambió rol: migrar perfil --------
        if old_rol != new_rol:
            # CLIENTE -> PROPIETARIO
            if old_rol == "CLIENTE" and new_rol == "PROPIETARIO":
                c = (
                    Interesado.objects.filter(usuario=user).order_by("-id").first()
                    or Interesado.objects.filter(email__iexact=old_email).order_by("-id").first()
                    or Interesado.objects.filter(email__iexact=new_email).order_by("-id").first()
                )

                p_exist = (
                    Propietario.objects.filter(usuario=user).order_by("-id").first()
                    or Propietario.objects.filter(email__iexact=new_email).order_by("-id").first()
                )

                if not p_exist:
                    Propietario.objects.create(
                        usuario=user,
                        email=new_email,
                        primer_nombre=(c.primer_nombre if c else ""),
                        segundo_nombre=(c.segundo_nombre if c else ""),
                        primer_apellido=(c.primer_apellido if c else ""),
                        segundo_apellido=(c.segundo_apellido if c else ""),
                        rut=(c.rut if c else ""),
                        telefono=(c.telefono if c else ""),
                    )

                # opcional: “desvincular” el interesado del user
                if c and c.usuario_id == user.id:
                    c.usuario = None
                    c.save(update_fields=["usuario"])

            # PROPIETARIO -> CLIENTE
            elif old_rol == "PROPIETARIO" and new_rol == "CLIENTE":
                p = (
                    Propietario.objects.filter(usuario=user).order_by("-id").first()
                    or Propietario.objects.filter(email__iexact=old_email).order_by("-id").first()
                    or Propietario.objects.filter(email__iexact=new_email).order_by("-id").first()
                )

                c_exist = (
                    Interesado.objects.filter(usuario=user).order_by("-id").first()
                    or Interesado.objects.filter(email__iexact=new_email).order_by("-id").first()
                )

                if not c_exist:
                    Interesado.objects.create(
                        usuario=user,
                        email=new_email,
                        primer_nombre=(p.primer_nombre if p else ""),
                        segundo_nombre=(p.segundo_nombre if p else ""),
                        primer_apellido=(p.primer_apellido if p else ""),
                        segundo_apellido=(p.segundo_apellido if p else ""),
                        rut=(p.rut if p else ""),
                        telefono=(p.telefono if p else ""),
                        fecha_registro=timezone.now(),
                    )

                if p and p.usuario_id == user.id:
                    p.usuario = None
                    p.save(update_fields=["usuario"])

        # -------- 3) Actualizar perfil según rol final --------
        if new_rol == "PROPIETARIO":
            p = (
                Propietario.objects.filter(usuario=user).order_by("-id").first()
                or Propietario.objects.filter(email__iexact=new_email).order_by("-id").first()
            )
            if p:
                if old_email != new_email:
                    p.email = new_email

                for f in ["primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido", "telefono"]:
                    if f in data:
                        setattr(p, f, data[f] or "")

                if p.usuario_id is None:
                    p.usuario = user

                p.save()

        elif new_rol == "CLIENTE":
            c = (
                Interesado.objects.filter(usuario=user).order_by("-id").first()
                or Interesado.objects.filter(email__iexact=new_email).order_by("-id").first()
            )
            if c:
                if old_email != new_email:
                    c.email = new_email

                for f in ["primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido", "telefono"]:
                    if f in data:
                        setattr(c, f, data[f] or "")

                if c.usuario_id is None:
                    c.usuario = user

                c.save()

    user.refresh_from_db()
    return Response(AdminUsuarioSerializer(user).data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_usuario_crear_perfil(request, pk: int):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "No encontrado."}, status=status.HTTP_404_NOT_FOUND)

    ser = AdminUsuarioCrearPerfilSerializer(data=request.data, context={"user": user})
    ser.is_valid(raise_exception=True)
    ser.save()

    # devolver el usuario actualizado con su perfil ya asociado
    user.refresh_from_db()
    return Response(AdminUsuarioSerializer(user).data, status=status.HTTP_201_CREATED)



@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_usuario_desactivar(request, pk: int):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "No encontrado."}, status=status.HTTP_404_NOT_FOUND)

    user.is_active = False
    user.save(update_fields=["is_active"])
    return Response({"ok": True})



@api_view(["POST"])
@permission_classes([IsAdminUser])
def admin_usuario_activar(request, pk: int):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "No encontrado."}, status=status.HTTP_404_NOT_FOUND)

    user.is_active = True
    user.save(update_fields=["is_active"])
    return Response({"ok": True})



def _parse_iso_date(s: str):
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


class AdminReservaListView(generics.ListAPIView):
    serializer_class = AdminReservaSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        Reserva.expirar_reservas_y_sync_estado()

        qs = (
            Reserva.objects
            .select_related("interesado", "propiedad")
            .order_by("-fecha")
        )

        # ---- filtros ----
        estado = (self.request.query_params.get("estado") or "").strip().lower()
        if estado and estado != "todas":
            # acepta solo estados válidos
            validos = {k for (k, _lbl) in Reserva.ESTADO_RESERVA}
            if estado in validos:
                qs = qs.filter(estado=estado)

        propiedad_id = (self.request.query_params.get("propiedad_id") or "").strip()
        if propiedad_id.isdigit():
            qs = qs.filter(propiedad_id=int(propiedad_id))

        desde = (self.request.query_params.get("desde") or "").strip()
        hasta = (self.request.query_params.get("hasta") or "").strip()

        d = parse_date(desde) if desde else None
        h = parse_date(hasta) if hasta else None
        # Usar datetime con timezone para evitar problemas con MariaDB y __date lookup
        if d:
            desde_dt = timezone.make_aware(datetime.combine(d, datetime.min.time()))
            qs = qs.filter(fecha__gte=desde_dt)
        if h:
            hasta_dt = timezone.make_aware(datetime.combine(h, datetime.max.time()))
            qs = qs.filter(fecha__lte=hasta_dt)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(interesado__primer_nombre__icontains=search) |
                Q(interesado__segundo_nombre__icontains=search) |
                Q(interesado__primer_apellido__icontains=search) |
                Q(interesado__segundo_apellido__icontains=search) |
                Q(interesado__email__icontains=search) |
                Q(interesado__rut__icontains=search) |
                Q(propiedad__titulo__icontains=search) |
                Q(propiedad__codigo__icontains=search)
            )

        return qs
    
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_reserva_detalle(request, pk):
    try:
        reserva = Reserva.objects.select_related(
            "propiedad", "interesado", "interesado__usuario"
        ).get(pk=pk)
    except Reserva.DoesNotExist:
        return Response({"detail": "Reserva no encontrada."}, status=404)

    ser = AdminReservaSerializer(reserva)
    return Response(ser.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_reserva_agregar_nota(request, pk):
  try:
      reserva = Reserva.objects.get(pk=pk)
  except Reserva.DoesNotExist:
      return Response({"detail": "Reserva no encontrada."}, status=404)

  texto = request.data.get("texto", "").strip()
  if not texto:
      return Response({"detail": "La nota no puede estar vacía."}, status=400)

  nota = ReservaNotaAdmin.objects.create(
      reserva=reserva,
      autor=request.user,
      texto=texto,
  )
  ser = ReservaNotaAdminSerializer(nota)
  return Response(ser.data, status=201)


logger = logging.getLogger(__name__)

@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])  
def admin_reserva_enviar_mensaje(request, pk):
    reserva = get_object_or_404(
        Reserva.objects.select_related("interesado", "propiedad"),
        pk=pk,
    )

    asunto = request.data.get("asunto") or "Actualización sobre tu reserva"
    cuerpo = (request.data.get("mensaje") or "").strip()

    if not cuerpo:
        return Response({"detail": "El mensaje no puede estar vacío."}, status=400)

    destinatario = reserva.interesado.email if (reserva.interesado and reserva.interesado.email) else None
    if not destinatario:
        return Response({"detail": "La reserva no tiene un email de cliente asociado."}, status=400)

    try:
        send_mail(
            subject=asunto,
            message=cuerpo,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@manque.local"),
            recipient_list=[destinatario],
            fail_silently=False,
        )
        enviado = True
    except Exception:
        logger.exception("Error enviando correo de reserva %s", reserva.id)
        enviado = False

    if enviado:
        now = timezone.now()
        if reserva.estado == "pendiente" and reserva.activa and reserva.expires_at and reserva.expires_at > now:
            reserva.estado = "confirmada"
            reserva.save(update_fields=["estado"])

    return Response({"ok": True, "email_enviado": enviado}, status=status.HTTP_200_OK)

def _es_admin(user) -> bool:
    return getattr(user, "rol", "") == "ADMIN"


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_reserva_cambiar_estado(request, pk):
    reserva = get_object_or_404(Reserva, pk=pk)

    nuevo_estado = (request.data.get("estado") or "").strip().lower()
    validos = {k for (k, _lbl) in Reserva.ESTADO_RESERVA}

    if nuevo_estado not in validos:
        return Response({"detail": "Estado no válido."}, status=400)

    now = timezone.now()

    if nuevo_estado in ("cancelada", "expirada"):
        reserva.activa = False
    else:
        reserva.activa = True
        if not reserva.expires_at:
            reserva.expires_at = now + timedelta(days=3)
        if reserva.expires_at <= now:
            return Response({"detail": "No puedes activar una reserva ya vencida."}, status=400)

    reserva.estado = nuevo_estado
    reserva.save(update_fields=["estado", "activa", "expires_at"])
    return Response(AdminReservaSerializer(reserva).data, status=200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_solicitudes_list(request):
    user = request.user
    if not _es_admin(user):
        return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

    qp = request.query_params

    filtro = (qp.get("estado") or "TODAS").strip().upper()
    search = (qp.get("search") or "").strip()
    desde = _parse_iso_date((qp.get("desde") or "").strip())
    hasta = _parse_iso_date((qp.get("hasta") or "").strip())

    mapa_estados = {
        "NUEVAS": "nueva",
        "EN_PROCESO": "en_proceso",
        "RESPONDIDAS": "respondida",
        "CERRADAS": "cerrada",
        "TODAS": None,
    }

    qs = (
        SolicitudCliente.objects
        .select_related("interesado", "interesado__usuario")
        .prefetch_related("notas_admin", "notas_admin__creado_por")
        .all()
        .order_by("-created_at")
    )

    # estado
    if filtro and filtro != "TODAS":
        estado_db = mapa_estados.get(filtro) 
        if not estado_db:
            estado_db = (qp.get("estado") or "").strip().lower()
        if estado_db:
            qs = qs.filter(estado=estado_db)

    # Usar datetime con timezone para evitar problemas con MariaDB y __date lookup
    if desde:
        desde_dt = timezone.make_aware(datetime.combine(desde, datetime.min.time()))
        qs = qs.filter(created_at__gte=desde_dt)
    if hasta:
        hasta_dt = timezone.make_aware(datetime.combine(hasta, datetime.max.time()))
        qs = qs.filter(created_at__lte=hasta_dt)

    if search:
        qs = qs.filter(
            Q(interesado__primer_nombre__icontains=search)
            | Q(interesado__segundo_nombre__icontains=search)
            | Q(interesado__primer_apellido__icontains=search)
            | Q(interesado__segundo_apellido__icontains=search)
            | Q(interesado__rut__icontains=search)
            | Q(interesado__email__icontains=search)
            | Q(ciudad__icontains=search)
            | Q(comuna__icontains=search)
            | Q(tipo_operacion__icontains=search)
            | Q(tipo_propiedad__icontains=search)
            | Q(mensaje__icontains=search)
        )

    ser = AdminSolicitudSerializer(qs, many=True)
    return Response(ser.data, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_solicitud_detalle(request, pk: int):
    user = request.user
    if not _es_admin(user):
        return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

    try:
        solicitud = (
            SolicitudCliente.objects
            .select_related("interesado", "interesado__usuario")
            .prefetch_related("notas_admin", "notas_admin__creado_por")
            .get(pk=pk)
        )
    except SolicitudCliente.DoesNotExist:
        return Response({"detail": "Solicitud no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    ser = AdminSolicitudSerializer(solicitud)
    return Response(ser.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_solicitud_cambiar_estado(request, pk: int):
    user = request.user
    if not _es_admin(user):
        return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

    try:
        solicitud = SolicitudCliente.objects.get(pk=pk)
    except SolicitudCliente.DoesNotExist:
        return Response({"detail": "Solicitud no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    nuevo_estado = (request.data.get("estado") or "").strip()
    if not nuevo_estado:
        return Response({"detail": "Debes indicar un estado."}, status=status.HTTP_400_BAD_REQUEST)

    # Acepta tanto tokens del front como valores reales de BD
    mapa_token_a_db = {
        "NUEVAS": "nueva",
        "EN_PROCESO": "en_proceso",
        "RESPONDIDAS": "respondida",
        "CERRADAS": "cerrada",
    }
    estado_db = mapa_token_a_db.get(nuevo_estado, nuevo_estado)

    estados_validos = {k for (k, _label) in SolicitudCliente.ESTADO_SOLICITUD}
    if estado_db not in estados_validos:
        return Response({"detail": "Estado de solicitud no válido."}, status=status.HTTP_400_BAD_REQUEST)

    solicitud.estado = estado_db
    solicitud.save(update_fields=["estado"])

    ser = AdminSolicitudSerializer(solicitud)
    return Response(ser.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_solicitud_agregar_nota(request, pk: int):
    user = request.user
    if not _es_admin(user):
        return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

    try:
        solicitud = SolicitudCliente.objects.get(pk=pk)
    except SolicitudCliente.DoesNotExist:
        return Response({"detail": "Solicitud no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    texto = (request.data.get("texto") or "").strip()
    if not texto:
        return Response({"detail": "El texto de la nota es obligatorio."}, status=status.HTTP_400_BAD_REQUEST)

    nota = SolicitudNotaAdmin.objects.create(
        solicitud=solicitud,
        texto=texto,
        creado_por=user,
    )

    ser = AdminSolicitudNotaSerializer(nota)
    return Response(ser.data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_solicitud_enviar_mensaje(request, pk: int):
    user = request.user
    if not _es_admin(user):
        return Response({"detail": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)

    try:
        solicitud = SolicitudCliente.objects.select_related("interesado", "interesado__usuario").get(pk=pk)
    except SolicitudCliente.DoesNotExist:
        return Response({"detail": "Solicitud no encontrada."}, status=status.HTTP_404_NOT_FOUND)

    mensaje = (request.data.get("mensaje") or "").strip()
    if not mensaje:
        return Response({"detail": "El mensaje no puede estar vacío."}, status=status.HTTP_400_BAD_REQUEST)

    interesado = solicitud.interesado

    # prioridad: email del perfil interesado, si no, el del usuario asociado
    email_destino = getattr(interesado, "email", None) or getattr(getattr(interesado, "usuario", None), "email", None)
    if not email_destino:
        return Response({"detail": "La solicitud no tiene email de cliente."}, status=status.HTTP_400_BAD_REQUEST)

    asunto = f"Respuesta a tu solicitud #{solicitud.id}"

    send_mail(
        subject=asunto,
        message=mensaje,
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@manquecorretajes.local"),
        recipient_list=[email_destino],
        fail_silently=False,
    )

    return Response({"ok": True}, status=status.HTTP_200_OK)


class AdminDashboardContratoPagoView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        contratos_vigentes = Contrato.objects.filter(vigente=True).count()
        contratos_total = Contrato.objects.count()
        pagos_total = Pago.objects.count()

        pagos_mes = (
            Pago.objects
            .values("fecha__year", "fecha__month")
            .order_by("-fecha__year", "-fecha__month")
            .annotate(total=models.Sum("monto"))
        )

        return Response({
            "contratos_vigentes": contratos_vigentes,
            "contratos_total": contratos_total,
            "pagos_total": pagos_total,
            "pagos_por_mes": pagos_mes,
        })

# =====================
# PROPIEDADES DISPONIBLES (sin contrato vigente)
# =====================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_propiedades_disponibles(request):
    """
    Lista propiedades que NO tienen un contrato vigente.
    Útil para el selector de propiedades al crear un nuevo contrato.
    """
    # IDs de propiedades con contrato vigente
    propiedades_con_contrato = Contrato.objects.filter(
        vigente=True
    ).values_list('propiedad_id', flat=True)

    # Propiedades disponibles (sin contrato vigente y aprobadas)
    propiedades = Propiedad.objects.filter(
        aprobada=True
    ).exclude(
        id__in=propiedades_con_contrato
    ).select_related('propietario').order_by('titulo')

    data = []
    for p in propiedades:
        data.append({
            'id': p.id,
            'titulo': p.titulo,
            'ciudad': p.ciudad,
            'tipo': p.tipo,
            'precio': float(p.precio) if p.precio else 0,
            'propietario': {
                'id': p.propietario_id,
                'nombre': f"{p.propietario.primer_nombre} {p.propietario.primer_apellido}" if p.propietario else None,
            } if p.propietario else None,
        })

    return Response(data)


# =====================
# INTERESADOS TIPO CLIENTE
# =====================
@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_interesados_clientes(request):
    """
    Lista todos los usuarios CLIENTE como interesados.
    Si un usuario CLIENTE no tiene Interesado, lo crea automáticamente.
    """
    User = get_user_model()

    # Obtener todos los usuarios con rol CLIENTE
    usuarios_cliente = User.objects.filter(rol='CLIENTE')

    data = []
    for user in usuarios_cliente:
        # Buscar o crear Interesado para este usuario
        interesado = Interesado.objects.filter(usuario=user).first()

        if not interesado:
            # Crear Interesado automáticamente para usuarios CLIENTE existentes
            nombre = user.first_name or user.username
            partes = nombre.strip().split()

            interesado = Interesado.objects.create(
                usuario=user,
                primer_nombre=partes[0] if partes else "",
                segundo_nombre=partes[1] if len(partes) > 2 else "",
                primer_apellido=partes[-1] if len(partes) > 1 else "",
                segundo_apellido="",
                email=user.email,
                telefono="",
            )

        nombre_completo = f"{interesado.primer_nombre or ''} {interesado.segundo_nombre or ''} {interesado.primer_apellido or ''} {interesado.segundo_apellido or ''}".strip()
        nombre_completo = ' '.join(nombre_completo.split())

        data.append({
            'id': interesado.id,
            'nombre_completo': nombre_completo or user.email,
            'rut': interesado.rut,
            'email': interesado.email or user.email,
            'telefono': interesado.telefono,
            'usuario_id': user.id,
        })

    return Response(data)
