from rest_framework import generics, permissions, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.dateparse import parse_date
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, time, timedelta

from inmobiliaria.models import Interesado, SolicitudCliente, Usuario
from inmobiliaria.serializers import InteresadoSerializer, SolicitudClienteSerializer


class MiPerfilClienteView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_or_create_interesado(self, user):

        interesado = Interesado.objects.filter(usuario=user).first()

        if interesado:
            return interesado


        if getattr(user, "rol", "").upper() != "CLIENTE":
            return None

        interesado = Interesado.objects.create(
            usuario=user,
            email=user.email or "",
            primer_nombre="",
            segundo_nombre="",
            primer_apellido="",
            segundo_apellido="",
            telefono="",
        )
        return interesado

    def get(self, request):
        user = request.user
        interesado = self._get_or_create_interesado(user)

        if not interesado:
            return Response(
                {"detail": "Tu cuenta no es de tipo cliente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = InteresadoSerializer(interesado).data
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        interesado = self._get_or_create_interesado(user)

        if not interesado:
            return Response(
                {"detail": "Tu cuenta no es de tipo cliente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = InteresadoSerializer(
            interesado, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)



class MisSolicitudesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        interesado = Interesado.objects.filter(usuario=user).first()
        if not interesado:
            return Response([])

        qs = SolicitudCliente.objects.filter(interesado=interesado).order_by("-created_at")

        # --- filtros ---
        estado = (request.query_params.get("estado") or "").strip()
        if estado:
            qs = qs.filter(estado__iexact=estado)

        raw_desde = (request.query_params.get("desde") or "").strip()
        raw_hasta = (request.query_params.get("hasta") or "").strip()

        desde = parse_date(raw_desde)
        hasta = parse_date(raw_hasta)


        tz = timezone.get_current_timezone()

        if desde and hasta:
            start = timezone.make_aware(datetime.combine(desde, time.min), tz)
            # end exclusivo: día siguiente a las 00:00
            end = timezone.make_aware(datetime.combine(hasta + timedelta(days=1), time.min), tz)

            qs = qs.filter(created_at__gte=start, created_at__lt=end)

        elif desde:
            start = timezone.make_aware(datetime.combine(desde, time.min), tz)
            qs = qs.filter(created_at__gte=start)

        elif hasta:
            end = timezone.make_aware(datetime.combine(hasta + timedelta(days=1), time.min), tz)
            qs = qs.filter(created_at__lt=end)


        return Response(SolicitudClienteSerializer(qs, many=True).data)

