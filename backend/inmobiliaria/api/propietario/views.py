from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from inmobiliaria.models import Propiedad, Propietario, Reserva, Contrato, Pago
from .serializers import PropietarioPerfilSerializer

from inmobiliaria.serializers import (
    PropiedadConFotosSerializer,
    ReservaSerializer,
    ContratoSerializer,
    PagoSerializer,
)

class MiPerfilPropietarioView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PropietarioPerfilSerializer

    def get_object(self):
        email = (self.request.user.email or "").lower()
        from rest_framework.exceptions import ValidationError, NotFound

        if not email:
            raise ValidationError("Tu usuario no tiene email asociado.")

        propietario = Propietario.objects.filter(email__iexact=email).first()
        if not propietario:
            raise NotFound("No se encontró un propietario asociado a tu cuenta.")

        return propietario


def _get_propietario_for_user(user):
    """Obtiene el Propietario asociado al usuario actual."""
    email = (user.email or "").lower()
    if not email:
        return None
    # Buscar por email o por usuario directo
    propietario = Propietario.objects.filter(usuario=user).first()
    if not propietario:
        propietario = Propietario.objects.filter(email__iexact=email).first()
    return propietario


class MisPropiedadesPropietarioView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PropiedadConFotosSerializer

    def get_queryset(self):
        user = self.request.user
        propietario = _get_propietario_for_user(user)
        if not propietario:
            return Propiedad.objects.none()
        return Propiedad.objects.filter(propietario=propietario).order_by("-fecha_registro")


class MisReservasPropietarioView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReservaSerializer

    def get_queryset(self):
        user = self.request.user
        propietario = _get_propietario_for_user(user)
        if not propietario:
            return Reserva.objects.none()
        return (
            Reserva.objects
            .filter(propiedad__propietario=propietario)
            .select_related("interesado", "propiedad")
            .order_by("-fecha")
        )


class MisContratosPropietarioView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratoSerializer

    def get_queryset(self):
        user = self.request.user
        propietario = _get_propietario_for_user(user)
        if not propietario:
            return Contrato.objects.none()
        return (
            Contrato.objects
            .filter(propiedad__propietario=propietario)
            .select_related("comprador_arrendatario", "propiedad")
            .order_by("-fecha_firma")
        )


class MisPagosPropietarioView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PagoSerializer

    def get_queryset(self):
        user = self.request.user
        propietario = _get_propietario_for_user(user)
        if not propietario:
            return Pago.objects.none()
        return (
            Pago.objects
            .filter(contrato__propiedad__propietario=propietario)
            .select_related("contrato", "contrato__comprador_arrendatario", "contrato__propiedad")
            .order_by("-fecha")
        )


