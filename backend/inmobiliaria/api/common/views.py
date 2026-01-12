from django.contrib.auth import get_user_model

from rest_framework import generics, status, filters
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.views import TokenObtainPairView

from inmobiliaria.models import Propiedad, Contrato, Pago, Reserva, Interesado
from inmobiliaria.validators import validar_rut, normalizar_rut, validar_telefono_cl
from django.core.exceptions import ValidationError as DjangoValidationError
from inmobiliaria.serializers import (
    PropiedadConFotosSerializer,
    ContratoSerializer,
    PagoSerializer,
    ReservaSerializer,
    CustomTokenObtainPairSerializer,
    CambiarPasswordSerializer,
)


User = get_user_model()
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        nombre = request.data.get("nombre_completo") or request.data.get("nombre")
        email = request.data.get("email")
        password = request.data.get("password")
        telefono = request.data.get("telefono", "")
        rut = request.data.get("rut", None)

        if not nombre or not email or not password:
            return Response(
                {"detail": "Faltan datos (nombre, email o contraseña)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar RUT si se proporciona
        if rut:
            try:
                rut = normalizar_rut(rut)
                validar_rut(rut)
            except DjangoValidationError as e:
                return Response(
                    {"detail": str(e.message)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Verificar RUT único
            if Interesado.objects.filter(rut=rut).exists():
                return Response(
                    {"detail": "Ya existe un usuario registrado con ese RUT."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Validar teléfono si se proporciona
        if telefono:
            try:
                validar_telefono_cl(telefono)
            except DjangoValidationError as e:
                return Response(
                    {"detail": str(e.message)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        username = email

        if User.objects.filter(username=username).exists():
            return Response(
                {"detail": "Ya existe un usuario con ese email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Separar nombre en partes
        partes = nombre.strip().split()
        primer_nombre = partes[0] if len(partes) > 0 else ""
        segundo_nombre = partes[1] if len(partes) > 2 else ""
        primer_apellido = partes[-2] if len(partes) > 2 else (partes[1] if len(partes) > 1 else "")
        segundo_apellido = partes[-1] if len(partes) > 2 else ""

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=nombre,
            rol='CLIENTE',  # Por defecto es CLIENTE
        )

        # Crear Interesado vinculado al usuario CLIENTE
        Interesado.objects.create(
            usuario=user,
            primer_nombre=primer_nombre,
            segundo_nombre=segundo_nombre,
            primer_apellido=primer_apellido,
            segundo_apellido=segundo_apellido,
            email=email,
            telefono=telefono,
            rut=rut,
        )

        return Response(
            {"detail": "Usuario creado correctamente."},
            status=status.HTTP_201_CREATED,
        )

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer



# Catálogo propiedades
class CatalogoPropiedadesView(generics.ListAPIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = PropiedadConFotosSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    filterset_fields = {
        "ciudad": ["exact", "icontains"],
        "tipo": ["exact"],
        "dormitorios": ["gte", "lte"],
        "baos": ["gte", "lte"],
        "precio": ["gte", "lte"],
    }

    search_fields = ["titulo", "descripcion", "ciudad"]
    ordering_fields = ["precio", "metros2", "dormitorios", "baos", "fecha_registro"]
    ordering = ["-fecha_registro"]

    def get_queryset(self):
        qs = Propiedad.objects.all()

        qs = qs.filter(aprobada=True)

        ciudad = self.request.query_params.get('ciudad')
        if ciudad:
            qs = qs.filter(ciudad__iexact=ciudad)

        tipo = self.request.query_params.get('tipo')
        if tipo:
            qs = qs.filter(tipo__iexact=tipo)

        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado__iexact=estado)

        pmin = self.request.query_params.get('precio_min')
        if pmin:
            qs = qs.filter(precio__gte=pmin)

        pmax = self.request.query_params.get('precio_max')
        if pmax:
            qs = qs.filter(precio__lte=pmax)

        return qs



# Mixtas
class MisContratosView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratoSerializer
    
    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")
        if rol == "ADMIN":
            return Contrato.objects.all().select_related("comprador_arrendatario", "propiedad")
        if rol == "CLIENTE":
            return Contrato.objects.filter(
                comprador_arrendatario__usuario=user
            ).select_related("comprador_arrendatario", "propiedad")
        if rol == "PROPIETARIO":
            return Contrato.objects.filter(
                propiedad__propietario_user=user
            ).select_related("comprador_arrendatario", "propiedad")
        return Contrato.objects.none()

class MisPagosView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PagoSerializer
    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")
        if rol == "ADMIN":
            return Pago.objects.all().select_related("contrato", "contrato__comprador_arrendatario", "contrato__propiedad")
        if rol == "CLIENTE":
            return Pago.objects.filter(
                contrato__comprador_arrendatario__usuario=user
            ).select_related("contrato", "contrato__comprador_arrendatario", "contrato__propiedad")
        if rol == "PROPIETARIO":
            return Pago.objects.filter(
                contrato__propiedad__propietario_user=user
            ).select_related("contrato", "contrato__comprador_arrendatario", "contrato__propiedad")
        return Pago.objects.none()

class MisReservasView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReservaSerializer
    def get_queryset(self):
        user = self.request.user
        rol = getattr(user, "rol", "")
        if rol == "ADMIN":
            return Reserva.objects.all().select_related("interesado", "propiedad")
        if rol == "CLIENTE":
            return Reserva.objects.filter(
                interesado__usuario=user
            ).select_related("interesado", "propiedad")
        if rol == "PROPIETARIO":
            return Reserva.objects.filter(
                propiedad__propietario_user=user
            ).select_related("interesado", "propiedad")
        return Reserva.objects.none()
    



User = get_user_model()

class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        password_actual = serializer.validated_data["password_actual"]
        password_nueva = serializer.validated_data["password_nueva"]

        if not user.check_password(password_actual):
            return Response(
                {"detail": "La contraseña actual es incorrecta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password_nueva)
        user.save()

        return Response(
            {"detail": "Contraseña actualizada correctamente."},
            status=status.HTTP_200_OK,
        )