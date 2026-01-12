from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator

from datetime import time, date
from dateutil.relativedelta import relativedelta
from .validators import * 
from .config import *

from django.contrib.auth.models import AbstractUser
from django.conf import settings



# Create your models here.

class Usuario(AbstractUser):
    ROLES = [
        ('ADMIN', 'Administrador'),
        ('PROPIETARIO', 'Propietario'),
        ('CLIENTE', 'Cliente'),
    ]
    rol = models.CharField(max_length=20, choices=ROLES, default='CLIENTE')
    aprobado = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.username} ({self.get_rol_display()})"
    
class Propietario(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="perfil_propietario",
    )
    primer_nombre = models.CharField(max_length=100)
    segundo_nombre = models.CharField(max_length=100)
    primer_apellido = models.CharField(max_length=100)
    segundo_apellido = models.CharField(max_length=100)
    rut = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=False)


    def clean(self):
        #Normaliza y valida el Rut
        if self.rut:
            self.rut = normalizar_rut(self.rut)
            validar_rut(self.rut)
        #Valida teléfono
        if self.telefono:
            validar_telefono_cl(self.telefono)

    def save(self, *args, **kwargs):
        #Normaliza antes de guardar
        if self.rut:
            self.rut = normalizar_rut(self.rut)
        super().save(*args, **kwargs)

    @property
    def nombre_completo(self):
        partes = [
            self.primer_nombre, self.segundo_nombre,
            self.primer_apellido, self.segundo_apellido
        ]
        return " ".join(p for p in partes if p).strip()

    def __str__(self):
        return f"{self.nombre_completo} - {self.rut}"

class Region(models.Model):
    nombre_region = models.CharField(max_length=100)
    numero_region = models.IntegerField(default=7)

    class Meta:
        verbose_name = 'Region'
        verbose_name_plural = 'Regiones'

    def __str__(self):
        return self.nombre_region
    
    
class Comuna(models.Model):
    nombre_comuna = models.CharField(max_length=200)
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="comunas")

    class Meta:
       unique_together = ('nombre_comuna', 'region')

    def __str__(self):
        return f"{self.nombre_comuna} ({self.region.nombre_region})"

class Direccion_propietario(models.Model):
    propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE, related_name='direcciones')
    calle_o_pasaje = models.CharField(max_length=200)
    numero = models.CharField(max_length=40)
    poblacion_o_villa = models.CharField(max_length=200, blank=True)
    comuna = models.ForeignKey(Comuna, on_delete=models.PROTECT, related_name='direcciones_propietario')
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name='direcciones_propietario')
    referencia = models.TextField(blank=True)
    codigo_postal = models.CharField(max_length=100, blank=True)
    principal = models.BooleanField(default=True)
    fecha = models.DateTimeField(auto_now_add=True)


    class Meta:
        verbose_name = 'Dirección del propietario'
        verbose_name_plural = 'Direcciones del propietario'

    def __str__(self):
        return f"{self.calle_o_pasaje},{self.numero},{self.comuna.nombre_comuna}"

class Propiedad(models.Model):
    TIPO_CHOICES = [
        ('casa', 'Casa'),
        ('departamento', 'Departamento'),
        ('parcela', 'Parcela'),
        ('oficina', 'Oficina'),
        ('bodega', 'Bodega'),
        ('terreno', 'Terreno'),
    ]
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('arrendada', 'Arrendada'),
        ('reservada', 'Reservada'),
        ('vendida', 'Vendida'),
    ]

    ORIENTACION = [
        ('sur', 'Sur'),
        ('norte', 'Norte'),
        ('este', 'Este'),
        ('oeste', 'Oeste'),
    ]
    ESTADO_APROBACION = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('pausada', 'Pausada'),
    ]

    # campo existente
    aprobada = models.BooleanField(default=False)


    propietario = models.ForeignKey(Propietario, on_delete=models.CASCADE, related_name='propiedades')
    orientacion = models.CharField(max_length=30, choices=ORIENTACION, default='sur')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    direccion = models.CharField(max_length=200)
    ciudad = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='casa')
    dormitorios = models.IntegerField(default=0,validators=[MinValueValidator(0)])
    baos = models.IntegerField(default=0,validators=[MinValueValidator(0)])
    metros2 = models.DecimalField(max_digits=8, decimal_places=2, default=0,
                                  validators=[MinValueValidator(0)])
    precio = models.DecimalField(max_digits=12, decimal_places=2,
                                 validators=[MinValueValidator(0)])
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default='disponible')
    fecha_registro = models.DateTimeField(auto_now_add=True)
    propietario_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="propiedades_subidas",null=True, blank=True)
    estado_aprobacion = models.CharField(max_length=20, choices=ESTADO_APROBACION, default='pendiente')
    observacion_admin = models.TextField(blank=True, null=True)
    codigo = models.CharField(max_length=20, unique=True, null=True, blank=True, db_index=True)


    class Meta:
        verbose_name = 'Propiedad'
        verbose_name_plural = 'Propiedades'
        indexes = [
            models.Index(fields=['estado', 'tipo']),
            models.Index(fields=['ciudad']),
            models.Index(fields=['precio']),      
            models.Index(fields=['aprobada']),    
        ]

    def save(self, *args, **kwargs):
        self.aprobada = (self.estado_aprobacion == "aprobada")
        from .models import Historial

        creando = self.pk is None
        old = None

        if not creando:
            try:
                old = Propiedad.objects.only('estado', 'precio').get(pk=self.pk)
            except Propiedad.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Generar código SOLO al crear (así nunca haces doble save en updates)
        if creando and not self.codigo:
            self.codigo = f"MAN-{self.id:06d}"
            super().save(update_fields=["codigo"])

        # Historial al crear
        if creando:
            try:
                Historial.objects.create(
                    propiedad=self,
                    accion='cambio_estado',
                    descripcion=f"Estado inicial: {self.estado}",
                )
                Historial.objects.create(
                    propiedad=self,
                    accion='actualizacion_precio',
                    descripcion=f"Precio inicial: {self.precio}",
                )
            except Exception:
                pass
            return

        # Historial cambios
        if old and old.estado != self.estado:
            try:
                Historial.objects.create(
                    propiedad=self,
                    accion='cambio_estado',
                    descripcion=f"Cambio de estado: {old.estado} → {self.estado}",
                )
            except Exception:
                pass

        if old and old.precio != self.precio:
            try:
                Historial.objects.create(
                    propiedad=self,
                    accion='actualizacion_precio',
                    descripcion=f"Cambio de precio: {old.precio} → {self.precio}",
                )
            except Exception:
                pass

    
    @property
    def foto_principal(self):
        fp = self.fotos.filter(principal=True).first()
        return fp.foto.url if fp and fp.foto else None
    
    def __str__(self):
        return f"{self.orientacion} - {self.titulo} - {self.propietario.primer_nombre}"



# Tabla interesados:
class Interesado(models.Model):
    primer_nombre = models.CharField(max_length=100)
    segundo_nombre = models.CharField(max_length=100)
    primer_apellido = models.CharField(max_length=100)
    segundo_apellido = models.CharField(max_length=100)
    rut = models.CharField(max_length=20, unique=True, null= True, validators=[validar_rut]) 
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    fecha_registro = models.DateTimeField(default=timezone.now, editable=False)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,related_name="perfil_interesado")

    def clean(self):
        from .validators import normalizar_rut, validar_rut, validar_telefono_cl
        if self.rut:
            self.rut = normalizar_rut(self.rut)
            validar_rut(self.rut)
        if self.telefono:
            validar_telefono_cl(self.telefono)

    # Junta nombres y apellidos
    @property
    def nombre_completo(self):
        partes = [
            self.primer_nombre, self.segundo_nombre,
            self.primer_apellido, self.segundo_apellido
        ]
        return " ".join(p for p in partes if p).strip()

    def __str__(self):
        return f"{self.nombre_completo} - {self.rut}"
    


class SolicitudCliente(models.Model):
    TIPO_OPERACION = [
        ("COMPRA", "Compra"),
        ("ARRIENDO", "Arriendo"),
    ]

    ESTADO_SOLICITUD = [
        ("nueva", "Nueva"),
        ("en_proceso", "En proceso"),
        ("respondida", "Respondida"),
        ("cerrada", "Cerrada"),
    ]

    interesado = models.ForeignKey("Interesado", on_delete=models.CASCADE, related_name="solicitudes")
    tipo_operacion = models.CharField(max_length=20, choices=TIPO_OPERACION)
    tipo_propiedad = models.CharField(
        max_length=20,
        choices=Propiedad.TIPO_CHOICES,
        default="casa",
    )


    ciudad = models.CharField(max_length=120)
    comuna = models.CharField(max_length=120)

    presupuesto_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])
    presupuesto_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)])

    mensaje = models.TextField()

    estado = models.CharField(max_length=20, choices=ESTADO_SOLICITUD, default="nueva", db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["estado", "created_at"])]

    def __str__(self):
        return f"Solicitud de {self.interesado.nombre_completo} ({self.tipo_operacion} {self.tipo_propiedad})"


class SolicitudNotaAdmin(models.Model):
    solicitud = models.ForeignKey(SolicitudCliente, on_delete=models.CASCADE, related_name="notas_admin")
    texto = models.TextField()
    creado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Nota solicitud #{self.solicitud_id}"
    

# Tabla Visitas:
MAX_VISITAS_POR_DIA = 2 
class Visita(models.Model):
    propiedad   = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name='visitas')
    interesado  = models.ForeignKey(Interesado, on_delete=models.CASCADE, related_name='visitas')
    fecha       = models.DateField()
    hora       = models.TimeField()
    estado      = models.CharField(max_length=100, default='agendada')  # agendada, confirmada, realizada, cancelada
    comentarios = models.TextField(blank=True)

    class Meta:
        unique_together = ('propiedad', 'interesado', 'fecha', 'hora')
        indexes = [models.Index(fields=['fecha', 'hora', 'estado'])]

    def clean(self):
        from .utils import slots_futuro
        hoy = timezone.localdate()

        # ventana futura
        delta = (self.fecha - hoy).days
        if delta < 0 or delta > VENTANA_FUTURA_MAX_DIAS:
            raise ValidationError(f"La fecha debe estar entre hoy y {VENTANA_FUTURA_MAX_DIAS} días en el futuro.")

        # lunes a viernes
        if self.fecha.weekday() > 4:
            raise ValidationError("Las visitas solo se pueden agendar de lunes a viernes.")

        # slots válidos
        if self.hora not in INTERVALO_PERMITIDOS:
            raise ValidationError("La hora debe ser un slot válido: 09–13 o 16–18 (en punto).")

        # no permite pasado
        if not slots_futuro(self.fecha, self.hora):
            raise ValidationError("La hora seleccionada ya pasó o está fuera del margen mínimo.")

        # doble booking propiedad/slot
        qs = Visita.objects.filter(propiedad=self.propiedad, fecha=self.fecha, hora=self.hora)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        if qs.exists():
            raise ValidationError("Ese horario ya está reservado para la propiedad.")
        
        visitas_dia = Visita.objects.filter(
            interesado=self.interesado,
            fecha=self.fecha,
            estado__in=["agendada", "confirmada"]  # considera solo activas
        )
        if self.pk:
            visitas_dia = visitas_dia.exclude(pk=self.pk)
        if visitas_dia.count() >= MAX_VISITAS_POR_DIA:
            raise ValidationError(f"El interesado ya alcanzó el máximo de {MAX_VISITAS_POR_DIA} visitas para ese día.")

# Tabla dias feriados
class Feriado(models.Model):
    fecha = models.DateField(unique=True)
    nombre = models.CharField(max_length=120)

    class Meta:
        ordering = ["fecha"]

    def __str__(self):
        return f"{self.fecha} - {self.nombre}"


# Tabla Reservas
class Reserva(models.Model):
    ESTADO_RESERVA = [
    ("pendiente", "Pendiente"),
    ("confirmada", "Confirmada"),
    ("cancelada", "Cancelada"),
    ("expirada", "Expirada"),
    ]

    estado = models.CharField(max_length=20, choices=ESTADO_RESERVA, default="pendiente", db_index=True)

    propiedad = models.ForeignKey("Propiedad", on_delete=models.CASCADE, related_name="reservas", db_index=True)
    interesado = models.ForeignKey("Interesado", on_delete=models.CASCADE, related_name="reservas", db_index=True)
    creada_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, db_index=True)
    fecha = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    monto_reserva = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notas = models.TextField(blank=True)
    activa = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['-fecha'] 
        indexes = [
            models.Index(fields=["propiedad", "activa"]),
            models.Index(fields=["expires_at"]),
        ]

    def clean(self):
        if not self.propiedad_id:
            return

        now = timezone.now()

        if self.estado in ("pendiente", "confirmada") and not self.expires_at:
            self.expires_at = now + timedelta(days=3)


        if self.estado in ("pendiente", "confirmada") and self.expires_at and self.expires_at <= now:
            self.estado = "expirada"
            self.activa = False


        if self.estado in ("cancelada", "expirada"):
            self.activa = False

        if self.activa:
            existe_otra = (
                Reserva.objects.filter(
                    propiedad_id=self.propiedad_id,
                    activa=True,
                    expires_at__gt=now,
                )
                .exclude(pk=self.pk)
                .exists()
            )
            if existe_otra:
                raise ValidationError("La propiedad ya tiene una reserva activa.")

        from .models import Contrato

        if self.activa and Contrato.objects.filter(propiedad_id=self.propiedad_id, vigente=True).exists():
            raise ValidationError("La propiedad ya posee un contrato vigente.")

        if self.activa and not self.expires_at:
            raise ValidationError("Debe definir 'expires_at' para la reserva activa.")

        if self.activa and self.expires_at and self.expires_at <= now:
            raise ValidationError("La fecha de vencimiento debe ser futura.")



    @classmethod
    def sync_estado_propiedad(cls, propiedad_id: int, now=None) -> None:
        from inmobiliaria.models import Propiedad, Contrato
        now = now or timezone.now()

        p = Propiedad.objects.only("id", "estado").filter(id=propiedad_id).first()
        if not p:
            return

        # no tocar estados finales
        if p.estado in ("arrendada", "vendida"):
            return

        if Contrato.objects.filter(propiedad_id=propiedad_id, vigente=True).exists():
            return

        hay_activa_vigente = cls.objects.filter(
            propiedad_id=propiedad_id,
            activa=True,
            expires_at__gt=now,
        ).exists()

        if hay_activa_vigente:
            if p.estado != "reservada":
                Propiedad.objects.filter(id=propiedad_id).update(estado="reservada")
        else:
            if p.estado == "reservada":
                Propiedad.objects.filter(id=propiedad_id).update(estado="disponible")


    from django.utils import timezone

    @classmethod
    def expirar_reservas_y_sync_estado(cls) -> int:
        from inmobiliaria.models import Propiedad
        now = timezone.now()

        qs_exp = cls.objects.filter(
            activa=True,
            expires_at__isnull=False,
            expires_at__lte=now,
            estado__in=["pendiente", "confirmada"],  # opcional pero recomendado
        )

        prop_ids_exp = list(qs_exp.values_list("propiedad_id", flat=True).distinct())

        expiradas = qs_exp.update(activa=False, estado="expirada")
        pegadas_ids = list(
            Propiedad.objects.filter(estado="reservada")
            .exclude(reservas__activa=True, reservas__expires_at__gt=now)
            .values_list("id", flat=True)
        )

        ids = set(prop_ids_exp) | set(pegadas_ids)

        if ids:
            Propiedad.objects.filter(id__in=ids, estado="reservada") \
                .exclude(reservas__activa=True, reservas__expires_at__gt=now) \
                .update(estado="disponible")

        return expiradas



    def save(self, *args, **kwargs):
        self.clean()
        with transaction.atomic():
            super().save(*args, **kwargs)

            if self.propiedad_id:
                Reserva.sync_estado_propiedad(self.propiedad_id)

    def __str__(self):
        return f"{self.propiedad} - {self.interesado}"

class Contrato(models.Model):
    TIPO = (("venta","Venta"),("arriendo","Arriendo"))
    propiedad = models.ForeignKey(Propiedad, on_delete=models.PROTECT, related_name="contratos")
    comprador_arrendatario = models.ForeignKey(Interesado, on_delete=models.PROTECT, related_name="contratos")
    tipo = models.CharField(max_length=10, choices=TIPO)
    fecha_firma = models.DateField()
    precio_pactado = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    vigente = models.BooleanField(default=True)
    archivo_pdf = models.FileField(upload_to='contratos/', blank=True, null=True, validators=[validar_pdf], verbose_name='Archivo PDF del contrato')
    subido_por = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    null=True, blank=True,
    on_delete=models.SET_NULL,
    related_name="contratos_subidos"
)
    class Meta:
        ordering = ['-fecha_firma'] 
        indexes = [models.Index(fields=["tipo","vigente"])]

    def dia_vencimiento(self) -> int:
        return 5

    def asegurar_cuotas_hasta(self, hasta: date) -> int:
        if self.tipo != "arriendo" or not self.vigente:
            return 0

        # Arrancamos desde el mes siguiente a la firma
        start = (self.fecha_firma.replace(day=1) + relativedelta(months=1))
        end = hasta.replace(day=1)

        created = 0
        cursor = start
        while cursor <= end:
            dia = self.dia_vencimiento()

            # calcular último día del mes para “clamp”
            next_month = cursor + relativedelta(months=1)
            last_day = (next_month - relativedelta(days=1)).day
            dia_real = min(dia, last_day)

            venc = date(cursor.year, cursor.month, dia_real)

            _, was_created = CuotaContrato.objects.get_or_create(
                contrato=self,
                vencimiento=venc,
                defaults={"monto": self.precio_pactado, "pagada": False},
            )
            if was_created:
                created += 1

            cursor = cursor + relativedelta(months=1)

        return created

    def __str__(self):
        return f"{self.tipo.title()} {self.propiedad.titulo} - {self.comprador_arrendatario.nombre_completo}"
    

# Tabla Pago
class Pago(models.Model):

    MEDIOS_PAGO = [
        ("transferencia", "Transferencia"),
        ("efectivo", "Efectivo"),
        ("tarjeta_debito", "Tarjeta de débito"),
        ("tarjeta_credito", "Tarjeta de crédito"),
        ("cheque", "Cheque"),
        ("webpay", "Webpay"),
        ("otro", "Otro"),
    ]
    
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="pagos")
    fecha = models.DateField()
    monto = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    medio = models.CharField(max_length=30, choices=MEDIOS_PAGO, default="transferencia")
    comprobante = models.FileField(upload_to="pagos/", blank=True, null=True, verbose_name='Comprobante / boleta')
    notas = models.TextField(blank=True)
    class Meta:
        ordering = ['-fecha']
    
    def __str__(self):
        return f"Pago {self.monto} - {self.contrato}"
    


from django.db import transaction
class PropiedadFoto(models.Model):
    propiedad = models.ForeignKey('Propiedad', on_delete=models.CASCADE, related_name='fotos')
    foto = models.ImageField(upload_to='propiedades/fotos/', validators=[validar_imagen])
    orden = models.PositiveIntegerField(default=0, db_index=True)
    principal = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ['propiedad', 'orden']

    def save(self, *args, **kwargs):
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.principal:
                (PropiedadFoto.objects
                 .filter(propiedad=self.propiedad)
                 .exclude(pk=self.pk)
                 .update(principal=False))



# Tabla documentos propiedad
class PropiedadDocumento(models.Model):
    TIPOS = [
        ("acreditacion", "Acreditación / dominio"),
        ("herencia", "Herencia / posesión efectiva"),
        ("certificado", "Certificado"),
        ("avaluo", "Tasación / avalúo"),
        ("plano", "Plano / croquis"),
        ("identidad", "Identidad propietario"),
        ("otro", "Otro"),
    ]

    propiedad = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name="documentos")
    tipo = models.CharField(max_length=30, choices=TIPOS, default="otro")
    nombre = models.CharField(max_length=120, blank=True)
    archivo = models.FileField(upload_to="propiedades/documentos/")
    created_at = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]

    

class ContratoDocumento(models.Model):
    TIPOS = [
        ("contrato", "Contrato firmado"),
        ("acreditacion", "Acreditación"),
        ("herencia", "Herencia / posesión efectiva"),
        ("certificado", "Certificado"),
        ("otro", "Otro"),
    ]

    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="documentos")
    tipo = models.CharField(max_length=30, choices=TIPOS, default="otro")
    nombre = models.CharField(max_length=120, blank=True)
    archivo = models.FileField(upload_to="contratos/documentos/")
    created_at = models.DateTimeField(auto_now_add=True)
    subido_por = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-created_at"]

#Tabla historial de cambios
class Historial(models.Model):

    ACCION = [
        ('cambio_estado', 'Cambio de estado'),
        ('actualizacion_precio', 'Actualización de precio'),
    ]

    propiedad = models.ForeignKey(Propiedad, on_delete=models.CASCADE, related_name="historial")
    fecha = models.DateTimeField(auto_now_add=True)
    accion = models.CharField(max_length=100, choices= ACCION, default= 'cambio_estado')
    descripcion = models.TextField(blank=True)
    usuario = models.CharField(max_length=100, blank=True) 

    class Meta:
        ordering = ['-fecha']
        indexes = [models.Index(fields=["accion", "fecha"])]
        verbose_name = "Historial"
        verbose_name_plural = "Historial"

    def __str__(self):
        return f"{self.propiedad.titulo} - {self.accion} ({self.fecha.date()})"
    


#Tabla comisión
class Comision(models.Model):
    contrato = models.OneToOneField('Contrato', on_delete=models.CASCADE, related_name="comision")
    porcentaje_comprador = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    porcentaje_vendedor  = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    fija_comprador = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fija_vendedor  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notas = models.TextField(blank=True)

    def total_estimada(self, base=None):
        if base is None:
            base = self.contrato.precio_pactado
        return (
            base * ((self.porcentaje_comprador + self.porcentaje_vendedor) / 100)
            + self.fija_comprador + self.fija_vendedor
        )
    
    def __str__(self):
        return f"Comisión de {self.contrato}"
    

def upload_comprobante_cuota(instance, filename):
    cid = instance.contrato_id or "sin_contrato"
    qid = instance.id or "nueva"
    return f"contratos/{cid}/cuotas/cuota_{qid}/{filename}"

#Tabla cuota contrato
class CuotaContrato(models.Model):
    contrato = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name="cuotas")
    vencimiento = models.DateField()
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    pagada = models.BooleanField(default=False)
    pago = models.ForeignKey("Pago", null=True, blank=True, on_delete=models.SET_NULL)
    comprobante = models.FileField(
        upload_to=upload_comprobante_cuota,
        null=True,
        blank=True
    )
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contrato", "vencimiento"], name="uniq_cuota_contrato_vencimiento")
        ]


    def registrar_pago(self, *, monto, fecha=None, medio="transferencia", notas="", comprobante=None):
        if self.pagada:
            raise ValidationError("Esta cuota ya está pagada.")

        if not self.contrato.vigente:
            raise ValidationError("No se puede pagar una cuota de un contrato no vigente.")

        if monto <= 0:
            raise ValidationError("El monto del pago debe ser mayor a 0.")

        if monto != self.monto:
            raise ValidationError("El monto del pago debe ser igual al monto de la cuota.")

        fecha = fecha or timezone.now().date()

        if not notas:
            notas = f"CUOTA: vencimiento {self.vencimiento.isoformat()}"
        elif not str(notas).upper().startswith("CUOTA:"):
            notas = f"CUOTA: {notas}"

        pago = Pago.objects.create(
            contrato=self.contrato,
            fecha=fecha,
            monto=monto,
            medio=medio,
            notas=notas,
            comprobante=comprobante,
        )

        self.pagada = True
        self.pago = pago
        self.save(update_fields=["pagada", "pago"])

        return pago

    def __str__(self):
        estado = "Pagada" if self.pagada else "Pendiente"
        return f"Cuota {self.contrato} - {self.vencimiento} ({estado})"
    
# Tabla notificaciones
class Notificacion(models.Model):
    TIPOS = [
        ("RESERVA", "Reserva"),
        ("VISITA", "Visita"),
        ("PAGO", "Pago"),
        ("SISTEMA", "Sistema"),
    ]
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="notificaciones")
    titulo = models.CharField(max_length=120)
    mensaje = models.TextField()
    tipo = models.CharField(max_length=16, choices=TIPOS, default="SISTEMA", db_index=True)
    leida = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tipo", "leida", "created_at"])]
        verbose_name = "Notificacion"
        verbose_name_plural = "Notificaciones"

    def __str__(self):
        return f"[{self.tipo}] {self.titulo}"


# Tabla detalle de una reserva
class ReservaNotaAdmin(models.Model):
    reserva = models.ForeignKey(
        "Reserva", on_delete=models.CASCADE, related_name="notas_admin"
    )
    autor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notas_reserva"
    )
    texto = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Nota reserva #{self.reserva_id} - {self.created_at:%Y-%m-%d}"
