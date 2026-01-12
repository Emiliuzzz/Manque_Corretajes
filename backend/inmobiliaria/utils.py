from datetime import timedelta, datetime
from django.utils import timezone
from django.db import transaction
from .models import Reserva, Propiedad
from .config import (
    INTERVALO_PERMITIDOS,
    VENTANA_FUTURA_MAX_DIAS,
    LEAD_MINUTES,
)

def es_habil(fecha):
    # Lunes(0) a Viernes(4) y no feriados
    from .models import Feriado
    return fecha.weekday() <= 4 and not Feriado.objects.filter(fecha=fecha).exists()

def slots_futuro(fecha, hora):
    # True si fecha y hora es en futuro
    now = timezone.localtime()

    if fecha < now.date():
        return False
    if fecha > now.date():
        return True

    # fecha == hoy: comparar hora con margen
    slot_dt = timezone.make_aware(datetime.combine(fecha, hora), now.tzinfo)
    cutoff = now + timedelta(minutes=LEAD_MINUTES)
    return slot_dt >= cutoff

def slots_disponibles_para_propiedad(propiedad_id, fecha):
    # Retorna lista de intervalos permitidos
    from .models import Visita

    if fecha is None or propiedad_id is None:
        return list(INTERVALO_PERMITIDOS)

    ocupados = set(
        Visita.objects.filter(propiedad_id=propiedad_id, fecha=fecha)
        .values_list("hora", flat=True)
    )

    candidatos = [h for h in INTERVALO_PERMITIDOS if slots_futuro(fecha, h)]
    libres = [h for h in candidatos if h not in ocupados]
    return libres

def generar_agenda_disponible(propiedad_id, start_date=None, days=14):
    # Genera días habiles con disponibilidad y normaliza cant de días
    if days < 1:
        days = 1
    if days > 31:
        days = 31

    hoy = timezone.localdate()
    inicio = start_date or hoy
    fin_max = hoy + timedelta(days=VENTANA_FUTURA_MAX_DIAS)

    fecha = inicio
    salida = []

    while fecha <= fin_max and len(salida) < days:
        if es_habil(fecha):
            libres = slots_disponibles_para_propiedad(propiedad_id, fecha)
            if libres:  # Solo días con disponibilidad
                salida.append({
                    "fecha": fecha.isoformat(),
                    "weekday": fecha.weekday(),
                    "is_holiday": False, 
                    "slots": [t.strftime("%H:%M") for t in libres],
                })
        fecha += timedelta(days=1)

    return salida

def liberar_reservas_vencidas():
    now = timezone.now()

    # Reservas activas vencidas
    vencidas = Reserva.objects.filter(activa=True, expires_at__isnull=False, expires_at__lte=now)

    if not vencidas.exists():
        return 0

    with transaction.atomic():
        # 1) desactivar reservas
        ids_propiedades = list(vencidas.values_list("propiedad_id", flat=True).distinct())
        vencidas.update(activa=False)

        # 2) actualizar estado propiedades
        for pid in ids_propiedades:
            sigue_reservada = Propiedad.objects.filter(id=pid, estado="reservada").exists()
            tiene_activa = Reserva.objects.filter(
                propiedad_id=pid,
                activa=True,
                expires_at__gt=now
            ).exists()

            if sigue_reservada and not tiene_activa:
                Propiedad.objects.filter(id=pid).update(estado="disponible")

    return len(ids_propiedades)