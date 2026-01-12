from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from datetime import datetime, date, timedelta
from django.utils import timezone
from dateutil.relativedelta import relativedelta

from django.db.models import Sum, Count, Q, Exists, OuterRef
from django.utils.dateparse import parse_date

from rest_framework import viewsets, status, filters, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


from .models import *
from .serializers import (
    RegionSerializer,
    ComunaSerializer,
    PropietarioDireccionSerializer,
    PropietarioSerializer,
    PropiedadSerializer,
    InteresadoSerializer,
    VisitaSerializer,
    PagoSerializer,
    CuotaContratoSerializer,
    PropiedadConFotosSerializer,
    PropiedadFotoSerializer,
    PropiedadDocumentoSerializer,
    NotificacionSerializer,
    ContratoSerializer,
    ReservaSerializer,
    HistorialSerializer,
    SolicitudClienteSerializer,
    ContratoWriteSerializer,
    ContratoDocumentoSerializer,
    PagarCuotaSerializer
)

from .notifications import notificar_usuario

from .config import *
from .utils import *
from .permissions import ReadOnlyOrAdminAsesor

from .permisssions_roles import PropiedadPermission, IsAdmin, NotificacionPermission

from .filters import PropiedadFilter

# Create your views here.


def index(request):
    return render(request,'index.html')
def hello(request):
    return HttpResponse("Hello World")

def about(request):
    return HttpResponse("About")

def propietario(request):
    propietario = list(Propietario.objects.values())
    return JsonResponse(propietario, safe=False)

def propiedad(request, id):
    propiedades = get_object_or_404(Propiedad, id=id)
    return HttpResponse('propiedad: %s' % propiedades.titulo)



class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all().order_by('nombre_region')
    serializer_class = RegionSerializer
    permission_classes = [ReadOnlyOrAdminAsesor]

class ComunaViewSet(viewsets.ModelViewSet):
    queryset = Comuna.objects.select_related('region').all().order_by('nombre_comuna')
    serializer_class = ComunaSerializer
    permission_classes = [ReadOnlyOrAdminAsesor]

class PropietarioViewSet(viewsets.ModelViewSet):
    queryset = Propietario.objects.all().order_by('primer_nombre')
    serializer_class = PropietarioSerializer
    permission_classes = [ReadOnlyOrAdminAsesor]

class PropietarioDireccionViewSet(viewsets.ModelViewSet):
    queryset = Direccion_propietario.objects.select_related('propietario','comuna','region').all().order_by('principal','-fecha')
    serializer_class = PropietarioDireccionSerializer
    permission_classes = [ReadOnlyOrAdminAsesor]

class InteresadoViewSet(viewsets.ModelViewSet):
    queryset = Interesado.objects.all().order_by('-id')
    serializer_class = InteresadoSerializer
    permission_classes = [ReadOnlyOrAdminAsesor]

def _filtro_propietario_user(qs, user, propiedad_prefix="propiedad"):
    """
    Soporta tus 2 variantes:
      - propiedad__propietario_user = user
      - propiedad__propietario__usuario = user
      - propiedad__propietario__email = user.email (fallback)
    """
    cond = Q(**{f"{propiedad_prefix}__propietario_user": user}) | \
           Q(**{f"{propiedad_prefix}__propietario__usuario": user})

    if user.email:
        cond |= Q(**{f"{propiedad_prefix}__propietario__email__iexact": user.email})

    return qs.filter(cond)


# =========================
# DOCUMENTOS DE PROPIEDAD
# =========================
class PropiedadDocumentoViewSet(viewsets.ModelViewSet):
    serializer_class = PropiedadDocumentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")

        qs = (
            PropiedadDocumento.objects
            .select_related("propiedad", "subido_por")
            .all()
            .order_by("-created_at")
        )

        prop_id = self.request.query_params.get("propiedad")
        if prop_id:
            qs = qs.filter(propiedad_id=prop_id)

        if rol == "ADMIN":
            return qs

        if rol == "PROPIETARIO":
            return _filtro_propietario_user(qs, user, propiedad_prefix="propiedad")

        if rol == "CLIENTE":
            # cliente ve docs SOLO si tiene contrato asociado a esa propiedad
            return qs.filter(propiedad__contratos__comprador_arrendatario__usuario=user).distinct()

        return qs.none()

    def _check_write_perm(self, propiedad):
        user = self.request.user
        rol = getattr(user, "rol", "")

        if rol == "ADMIN":
            return

        if rol == "PROPIETARIO":
            # solo puede tocar docs de sus propiedades
            ok = (
                getattr(propiedad, "propietario_user_id", None) == getattr(user, "id", None)
                or getattr(getattr(propiedad, "propietario", None), "usuario_id", None) == getattr(user, "id", None)
            )
            if ok:
                return

        raise PermissionDenied("No tienes permisos para modificar documentos de esta propiedad.")

    def perform_create(self, serializer):
        user = self.request.user
        rol = getattr(user, "rol", "")

        if rol not in ["ADMIN", "PROPIETARIO"]:
            raise PermissionDenied("Solo ADMIN o PROPIETARIO pueden subir documentos de propiedad.")

        propiedad = serializer.validated_data.get("propiedad")
        self._check_write_perm(propiedad)

        serializer.save(subido_por=user)

    def perform_update(self, serializer):
        propiedad = serializer.instance.propiedad
        self._check_write_perm(propiedad)
        serializer.save()

    def perform_destroy(self, instance):
        self._check_write_perm(instance.propiedad)
        instance.delete()

class VisitaViewSet(viewsets.ModelViewSet):
    queryset = Visita.objects.all().order_by("-id")
    serializer_class = VisitaSerializer
    permission_classes = [ReadOnlyOrAdminAsesor]

    @action(detail=False, methods=["GET"], url_path="slots")
    def slots(self, request):
        prop_id = request.query_params.get("propiedad")
        fecha_str = request.query_params.get("fecha")
        if not prop_id or not fecha_str:
            return Response({"detail": "Falta propiedad o fecha"}, status=400)
        try:
            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"detail": "Formato de fecha inválido (YYYY-MM-DD)"}, status=400)

        libres = slots_disponibles_para_propiedad(int(prop_id), fecha)
        return Response([h.strftime("%H:%M") for h in libres], status=200)

    @action(detail=False, methods=["GET"], url_path="agenda")
    def agenda(self, request):
        prop_id = request.query_params.get("propiedad")
        if not prop_id:
            return Response({"detail": "Falta propiedad"}, status=400)

        start_str = request.query_params.get("start")
        days_str = request.query_params.get("days")

        start = None
        if start_str:
            try:
                start = datetime.strptime(start_str, "%Y-%m-%d").date()
            except ValueError:
                return Response({"detail": "start inválido, use YYYY-MM-DD"}, status=400)

        days = DEFAULT_DAYS_PAGE
        if days_str:
            try:
                days = int(days_str)
            except ValueError:
                pass
        if days < 1:
            days = 1
        if days > MAX_DAYS_PAGE:
            days = MAX_DAYS_PAGE

        data = generar_agenda_disponible(int(prop_id), start_date=start, days=days)
        return Response(data, status=200)



class ReservaViewSet(viewsets.ModelViewSet):
    queryset = Reserva.objects.all()
    serializer_class = ReservaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")

        qs = (
            Reserva.objects
            .select_related("interesado", "propiedad")
            .all()
            .order_by("-fecha")
        )

        # ---- filtro por rol  ----
        if rol == "ADMIN":
            pass
        elif rol == "CLIENTE":
            qs = qs.filter(interesado__usuario=user)
        elif rol == "PROPIETARIO":
            qs = qs.filter(propiedad__propietario_user=user)
        else:
            return qs.none()

        # ---- filtros por query params ----
        params = self.request.query_params
        estado = (params.get("estado") or "").strip().lower()
        search = (params.get("search") or "").strip()
        desde = parse_date(params.get("desde") or "")
        hasta = parse_date(params.get("hasta") or "")

        now = timezone.now()

        # (A) FILTRO estado "UI" coherente con tu serializer 
        if estado:
            if estado == "expirada":
                qs = qs.filter(Q(estado="expirada") | Q(expires_at__lte=now))
            elif estado == "pendiente":
                qs = qs.filter(estado="pendiente", expires_at__gt=now)
            elif estado == "confirmada":
                qs = qs.filter(estado="confirmada", expires_at__gt=now)
            elif estado == "cancelada":
                qs = qs.filter(estado="cancelada")
            else:
                qs = qs.filter(estado=estado)

        if desde:
            desde_dt = timezone.make_aware(datetime.combine(desde, datetime.min.time()))
            qs = qs.filter(fecha__gte=desde_dt)
        if hasta:
            hasta_dt = timezone.make_aware(datetime.combine(hasta, datetime.max.time()))
            qs = qs.filter(fecha__lte=hasta_dt)

        # (C) búsqueda libre
        if search:
            q = (
                Q(propiedad__titulo__icontains=search) |
                Q(propiedad__ciudad__icontains=search) |
                Q(propiedad__tipo__icontains=search) |
                Q(propiedad__estado__icontains=search) |
                Q(interesado__primer_nombre__icontains=search) |
                Q(interesado__primer_apellido__icontains=search)
            )

            if search.isdigit():
                q = q | Q(id=int(search))

            qs = qs.filter(q)

        return qs

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def cancelar(self, request, pk=None):
        reserva = self.get_object()
        user = request.user
        rol = getattr(user, "rol", "")
        propiedad = reserva.propiedad

        es_admin = (rol == "ADMIN")

        es_propietario = False
        if hasattr(propiedad, "propietario_user") and propiedad.propietario_user == user:
            es_propietario = True
        elif hasattr(propiedad, "propietario") and getattr(propiedad.propietario, "usuario_id", None) == user.id:
            es_propietario = True

        es_cliente = (
            rol == "CLIENTE"
            and reserva.interesado
            and reserva.interesado.usuario_id == user.id
        )

        # ---- Permisos: admin, propietario o el mismo cliente ----
        if not (es_admin or es_propietario or es_cliente):
            return Response(
                {"detail": "No tienes permiso para cancelar esta reserva."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ---- Validaciones de estado ----
        if not reserva.activa:
            return Response({"detail": "La reserva ya está cancelada o cerrada."}, status=400)

        if reserva.expires_at and reserva.expires_at <= timezone.now():
            return Response({"detail": "No puedes cancelar una reserva expirada."}, status=400)

        # Cliente solo puede cancelar si está pendiente
        if es_cliente and reserva.estado != "pendiente":
            return Response({"detail": "Solo puedes cancelar reservas pendientes."}, status=400)

        # ---- Cancelar ----
        reserva.activa = False
        reserva.estado = "cancelada"
        reserva.save(update_fields=["activa", "estado"])

        Reserva.sync_estado_propiedad(reserva.propiedad_id)

        # ---- Notificaciones ----
        interesado = reserva.interesado

        propietario_user = getattr(propiedad, "propietario_user", None)
        if not propietario_user and hasattr(propiedad, "propietario"):
            propietario_user = getattr(propiedad.propietario, "usuario", None)

        cliente_user = getattr(interesado, "usuario", None)

        titulo = f"Reserva cancelada en '{propiedad.titulo}'"

        msg_prop = (
            f"Se ha cancelado la reserva #{reserva.id} de "
            f"{interesado.nombre_completo} para la propiedad '{propiedad.titulo}'."
        )
        notificar_usuario(propietario_user, titulo, msg_prop, tipo="RESERVA")

        if cliente_user:
            msg_cli = (
                f"Tu reserva #{reserva.id} para la propiedad '{propiedad.titulo}' "
                f"ha sido cancelada."
            )
            notificar_usuario(cliente_user, titulo, msg_cli, tipo="RESERVA")

        serializer = self.get_serializer(reserva)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def perform_create(self, serializer):
        user = self.request.user

        # Buscar el perfil de cliente (Interesado) asociado al usuario
        interesado = Interesado.objects.filter(usuario=user).first()

        if not interesado:
            interesado = Interesado.objects.create(
                usuario=user,
                email=user.email or "",
                primer_nombre="",
                primer_apellido="",
            )

        expires_at = timezone.now() + timedelta(days=3)

        reserva = serializer.save(
            creada_por=user,
            interesado=interesado,
            expires_at=expires_at,
        )
        Reserva.sync_estado_propiedad(reserva.propiedad_id)
        prop = reserva.propiedad

        # Notificaciones
        propietario_user = getattr(prop, "propietario_user", None)
        if not propietario_user and hasattr(prop, "propietario"):
            propietario_user = getattr(prop.propietario, "usuario", None)

        cliente_user = getattr(interesado, "usuario", None)

        titulo = f"Nueva reserva en '{prop.titulo}'"

        msg_prop = (
            f"Se creó la reserva #{reserva.id} para la propiedad '{prop.titulo}' "
            f"a nombre de {interesado.nombre_completo} por "
            f"${reserva.monto_reserva:,.0f}."
        )
        notificar_usuario(propietario_user, titulo, msg_prop, tipo="RESERVA")

        if cliente_user:
            msg_cli = (
                f"Hemos registrado tu reserva #{reserva.id} para la propiedad "
                f"'{prop.titulo}' por ${reserva.monto_reserva:,.0f}."
            )
            notificar_usuario(cliente_user, titulo, msg_cli, tipo="RESERVA")

    
    
class ContratoViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoSerializer
    permission_classes = [IsAuthenticated]

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["tipo", "vigente", "propiedad", "comprador_arrendatario"]
    ordering_fields = ["fecha_firma", "id", "precio_pactado", "vigente", "tipo"]
    search_fields = ["propiedad__titulo", "comprador_arrendatario__nombre_completo"]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")

        qs = (
            Contrato.objects
            .select_related("comprador_arrendatario", "propiedad")
            .order_by("-fecha_firma", "-id")
        )

        if rol == "ADMIN":
            return qs

        if rol == "CLIENTE":
            return qs.filter(comprador_arrendatario__usuario=user)

        if rol == "PROPIETARIO":
            return _filtro_propietario_user(qs, user, propiedad_prefix="propiedad")

        return qs.none()

    def retrieve(self, request, *args, **kwargs):
        contrato = self.get_object()

        if contrato.tipo == "arriendo" and contrato.vigente:
            contrato.asegurar_cuotas_hasta(date.today() + relativedelta(months=3))

        serializer = self.get_serializer(contrato)
        return Response(serializer.data)
    
    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ContratoWriteSerializer
        return ContratoSerializer

    def get_permissions(self):
        # solo ADMIN puede crear/editar/borrar contrato
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()
        
    def perform_create(self, serializer):
        contrato = serializer.save(subido_por=self.request.user)

        if contrato.tipo == "arriendo" and contrato.vigente:
            contrato.asegurar_cuotas_hasta(date.today() + relativedelta(months=6))
    
    def perform_update(self, serializer):
        contrato = serializer.save()

        if contrato.tipo == "arriendo" and contrato.vigente:
            contrato.asegurar_cuotas_hasta(date.today() + relativedelta(months=6))

    parser_classes = [MultiPartParser, FormParser, JSONParser]
    

class ContratoDocumentoViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoDocumentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")

        qs = (
            ContratoDocumento.objects
            .select_related("contrato", "contrato__propiedad", "contrato__comprador_arrendatario", "subido_por")
            .all()
            .order_by("-created_at")
        )

        contrato_id = self.request.query_params.get("contrato")
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)

        if rol == "ADMIN":
            return qs

        if rol == "CLIENTE":
            return qs.filter(contrato__comprador_arrendatario__usuario=user)

        if rol == "PROPIETARIO":
            return _filtro_propietario_user(qs, user, propiedad_prefix="contrato__propiedad")

        return qs.none()

    def get_permissions(self):
        # solo ADMIN sube/edita/borrar docs de contrato
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(subido_por=self.request.user)


class PagoViewSet(viewsets.ModelViewSet):
    serializer_class = PagoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Pago.objects.select_related("contrato", "contrato__propiedad").all().order_by("-fecha")

        contrato_id = self.request.query_params.get("contrato")
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)

        user = self.request.user
        rol = getattr(user, "rol", "")

        if rol == "ADMIN":
            return qs
        if rol == "CLIENTE":
            return qs.filter(contrato__comprador_arrendatario__usuario=user)
        if rol == "PROPIETARIO":
            return qs.filter(contrato__propiedad__propietario_user=user)
        return qs.none()

    def get_permissions(self):
        # solo ADMIN puede crear/editar/borrar pagos
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        pago = serializer.save()
        contrato = pago.contrato
        prop = contrato.propiedad
        comprador = contrato.comprador_arrendatario

        propietario_user = getattr(prop, "propietario_user", None)
        if not propietario_user and hasattr(prop, "propietario"):
            propietario_user = getattr(prop.propietario, "usuario", None)

        cliente_user = getattr(comprador, "usuario", None)

        titulo = f"Pago registrado para '{prop.titulo}'"

        msg_prop = (
            f"Se registró un pago de ${pago.monto:,.0f} para el contrato "
            f"#{contrato.id} de la propiedad '{prop.titulo}'."
        )
        notificar_usuario(propietario_user, titulo, msg_prop, tipo="PAGO")

        if cliente_user:
            msg_cli = (
                f"Hemos registrado tu pago de ${pago.monto:,.0f} "
                f"para el contrato #{contrato.id} de la propiedad '{prop.titulo}'."
            )
            notificar_usuario(cliente_user, titulo, msg_cli, tipo="PAGO")
    
class PropiedadViewSet(viewsets.ModelViewSet):
    queryset = Propiedad.objects.all().order_by("-fecha_registro")
    permission_classes = [PropiedadPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PropiedadFilter
    search_fields = ["titulo", "descripcion", "ciudad", "propietario__primer_nombre", "propietario__rut"]
    ordering_fields = ["precio", "metros2", "dormitorios", "baos", "fecha_registro"]
    ordering = ["-fecha_registro"]

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return PropiedadConFotosSerializer
        return PropiedadSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user

        # visitante no autenticado
        if not user.is_authenticated:
            qs = qs.filter(aprobada=True)
        else:
            rol = getattr(user, "rol", "")

            # admin ve todo
            if rol == "ADMIN":
                qs = qs
            elif rol == "PROPIETARIO":
                qs = qs.filter(Q(aprobada=True) | Q(propietario_user=user))
            else:
                qs = qs.filter(aprobada=True)

        disponibles = self.request.query_params.get("disponibles_contrato")
        if disponibles in ("1", "true", "True"):
            contratos_vigentes = Contrato.objects.filter(
                propiedad_id=OuterRef("pk"),
                vigente=True
            )
            qs = qs.annotate(
                tiene_contrato_vigente=Exists(contratos_vigentes)
            ).filter(tiene_contrato_vigente=False)

        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        if user and getattr(user, "rol", "") == "PROPIETARIO":
            # Propiedad creada por propietario: queda pendiente, no aprobada
            serializer.save(
                propietario_user=user,
                aprobada=False,
                estado_aprobacion="pendiente",
            )
        else:
            serializer.save()

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def aprobar(self, request, pk=None):
        propiedad = self.get_object()
        propiedad.aprobada = True
        propiedad.estado_aprobacion = "aprobada"
        propiedad.observacion_admin = ""
        propiedad.save(update_fields=["aprobada", "estado_aprobacion", "observacion_admin"])
        return Response({"detail": "Propiedad aprobada exitosamente."})

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def rechazar(self, request, pk=None):
        propiedad = self.get_object()
        obs = request.data.get("observacion", "")
        propiedad.aprobada = False
        propiedad.estado_aprobacion = "rechazada"
        propiedad.observacion_admin = obs
        propiedad.save(update_fields=["aprobada", "estado_aprobacion", "observacion_admin"])
        return Response({"detail": "Propiedad rechazada.", "observacion": obs})

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def pausar(self, request, pk=None):
        propiedad = self.get_object()
        propiedad.aprobada = False
        propiedad.estado_aprobacion = "pausada"
        propiedad.save(update_fields=["aprobada", "estado_aprobacion"])
        return Response({"detail": "Propiedad pausada."})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        user = request.user
        rol = getattr(user, "rol", "")

        if rol == "PROPIETARIO" and instance.propietario_user_id != user.id:
            raise PermissionDenied("No puedes modificar propiedades que no son tuyas.")

        data = request.data.copy()

        if rol == "PROPIETARIO" and instance.aprobada:
            campos_permitidos = {"descripcion", "precio"}
            keys_to_remove = [k for k in data.keys() if k not in campos_permitidos]
            for k in keys_to_remove:
                data.pop(k, None)
            if not data:
                raise PermissionDenied(
                    "No tienes permiso para modificar otros campos de una propiedad aprobada."
                )

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)
    
    @action(detail=True, methods=["get"], url_path="historial")
    def historial(self, request, pk=None):
        propiedad = self.get_object()
        qs = Historial.objects.filter(propiedad=propiedad).order_by("-fecha")
        serializer = HistorialSerializer(qs, many=True)
        return Response(serializer.data)


class PropiedadFotoViewSet(viewsets.ModelViewSet):
    queryset = PropiedadFoto.objects.select_related("propiedad").all()
    serializer_class = PropiedadFotoSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["propiedad"] 

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        rol = getattr(user, "rol", "")
        if rol == "ADMIN":
            return qs
        if rol == "PROPIETARIO":
            return qs.filter(propiedad__propietario_user=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        rol = getattr(user, "rol", "")

        prop = serializer.validated_data.get("propiedad")
        if rol == "PROPIETARIO":
            if not prop or prop.propietario_user_id != user.id:
                raise PermissionDenied(
                    "No puedes subir fotos para propiedades que no son tuyas."
                )
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        rol = getattr(user, "rol", "")

        if rol == "PROPIETARIO" and instance.propiedad.propietario_user_id != user.id:
            raise PermissionDenied("No puedes eliminar fotos de otras propiedades.")

        super().perform_destroy(instance)

    @action(detail=True, methods=["post"])
    def marcar_principal(self, request, pk=None):
        foto = self.get_object()
        user = request.user
        rol = getattr(user, "rol", "")

        if rol == "PROPIETARIO" and foto.propiedad.propietario_user_id != user.id:
            raise PermissionDenied(
                "No puedes modificar fotos de una propiedad que no es tuya."
            )

        foto.principal = True
        foto.save(update_fields=["principal"])
        return Response({"detalle": "Foto marcada como principal."}, status=200)



class CuotaContratoViewSet(viewsets.ModelViewSet):
    serializer_class = CuotaContratoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CuotaContrato.objects.select_related(
            "contrato", "contrato__propiedad"
        ).all().order_by("-vencimiento")

        contrato = self.request.query_params.get("contrato")
        if contrato:
            qs = qs.filter(contrato_id=contrato)

        user = self.request.user
        rol = getattr(user, "rol", "")

        if rol == "ADMIN":
            return qs
        if rol == "CLIENTE":
            return qs.filter(contrato__comprador_arrendatario__usuario=user)
        if rol == "PROPIETARIO":
            return qs.filter(contrato__propiedad__propietario_user=user)
        return qs.none()

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, IsAdmin],
        parser_classes=[MultiPartParser, FormParser], 
    )
    def pagar(self, request, pk=None):
        cuota = self.get_object()

        ser = PagarCuotaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        comprobante = data.get("comprobante")  

        pago = cuota.registrar_pago(
            monto=data["monto"],
            medio=data.get("medio") or "transferencia",
            fecha=data.get("fecha") or timezone.now().date(),
            notas=data.get("notas") or "",
            comprobante=comprobante,  
        )
        if comprobante:
            cuota.comprobante = comprobante
            cuota.save(update_fields=["comprobante"])

        cuota.refresh_from_db()

        return Response(
            {
                "ok": True,
                "cuota": CuotaContratoSerializer(cuota, context={"request": request}).data,
                "pago": PagoSerializer(pago, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )
    
class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated, NotificacionPermission]
    filterset_fields = ["tipo", "leida"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Notificacion.objects.select_related("usuario").order_by("-created_at")
        user = self.request.user
        if getattr(user, "rol", "") == "ADMIN":
            return qs
        return qs.filter(usuario=user)

    @action(detail=True, methods=["post"])
    def leer(self, request, pk=None):
        notif = self.get_object()
        notif.leida = True
        notif.save(update_fields=["leida"])
        return Response({"detalle": "Notificación marcada como leída."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="marcar-todas")
    def marcar_todas(self, request):
        user = request.user
        qs = self.get_queryset().filter(leida=False)
        updated = qs.update(leida=True)
        return Response({"detalle": f"{updated} notificaciones marcadas como leídas."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="contador")
    def contador(self, request):
        qs = self.get_queryset()
        total = qs.count()
        no_leidas = qs.filter(leida=False).count()
        por_tipo = (
            qs.values("tipo")
              .annotate(total=Count("id"), no_leidas=Count("id", filter=models.Q(leida=False)))
        )
        return Response({
            "total": total,
            "no_leidas": no_leidas,
            "por_tipo": {row["tipo"]: {"total": row["total"], "no_leidas": row["no_leidas"]} for row in por_tipo}
        }, status=status.HTTP_200_OK)


class SolicitudClienteViewSet(viewsets.ModelViewSet):
    serializer_class = SolicitudClienteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")
        qs = SolicitudCliente.objects.select_related("interesado").order_by("-created_at")

        if rol == "ADMIN":
            return qs
        if rol == "CLIENTE":
            return qs.filter(interesado__usuario=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        interesado = Interesado.objects.filter(usuario=user).first()
        if not interesado:
            raise ValidationError("No se encontró un perfil de interesado asociado a tu usuario.")
        serializer.save(interesado=interesado)



    
class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        es_admin = getattr(user, "rol", "") == "ADMIN" or user.is_staff
        if request.method in permissions.SAFE_METHODS:
            return es_admin
        return es_admin


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Campos extra en el JWT
        token["email"] = user.email
        token["rol"] = getattr(user, "rol", "")
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer