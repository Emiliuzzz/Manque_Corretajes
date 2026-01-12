from rest_framework import serializers
from .models import *
from .validators import *
from .config import *
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Sum
from datetime import timedelta
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['id', 'nombre_region']

class ComunaSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    id_region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), source='region', write_only=True
    )

    class Meta:
        model = Comuna
        fields = ['id', 'nombre_comuna', 'region', 'id_region']

class PropietarioDireccionSerializer(serializers.ModelSerializer):
    comuna = ComunaSerializer(read_only=True)
    id_comuna = serializers.PrimaryKeyRelatedField(queryset=Comuna.objects.all(), source='comuna', write_only=True)
    region = RegionSerializer(read_only=True)
    id_region = serializers.PrimaryKeyRelatedField(queryset=Region.objects.all(), source='region', write_only=True)

    class Meta:
        model = Direccion_propietario
        fields = [
            'id','calle_o_pasaje','numero','poblacion_o_villa',
            'comuna','id_comuna','region','id_region','referencia','codigo_postal',
            'principal','fecha'
        ]

class PropietarioSerializer(serializers.ModelSerializer):
    direcciones = PropietarioDireccionSerializer(many=True, read_only=True)
    class Meta:
        model = Propietario
        fields = ['id','primer_nombre', "segundo_nombre", "primer_apellido",
                  "segundo_apellido",'rut','telefono','email','direcciones']

    def validate_rut(self, value):
        v = normalizar_rut(value)
        validar_rut(v)
        return v
    
    def validate_telefono(self, value):
        if value:
            validar_telefono_cl(value)
        return value



# --- Helper para calcular el estado de la propiedad --- #
def calcular_estado_propiedad(obj: Propiedad) -> str:
    if obj.estado in ("arrendada", "vendida"):
        return obj.estado

    now = timezone.now()

    contrato = (
        Contrato.objects
        .filter(propiedad=obj, vigente=True)
        .order_by("-fecha_firma", "-id")
        .first()
    )
    if contrato:
        return "vendida" if contrato.tipo == "venta" else "arrendada"

    tiene_reserva_vigente = Reserva.objects.filter(
        propiedad=obj,
        activa=True,
        expires_at__gt=now,
    ).exists()

    return "reservada" if tiene_reserva_vigente else "disponible"

# PROPIEDAD SERIALIZERS
class MiniPropiedadSerializer(serializers.ModelSerializer):
    estado = serializers.SerializerMethodField()

    class Meta:
        model = Propiedad
        fields = ("id", "titulo", "precio", "ciudad", "tipo", "estado", "aprobada", "codigo")

    def get_estado(self, obj):
        return calcular_estado_propiedad(obj)
    
class PropiedadSerializer(serializers.ModelSerializer):
    estado = serializers.SerializerMethodField()

    class Meta:
        model = Propiedad
        fields = "__all__"

    def get_estado(self, obj):
        return calcular_estado_propiedad(obj)

    def validate(self, attrs):
        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))

        if tipo in ["terreno", "parcela"]:
            attrs["dormitorios"] = 0
            attrs["baos"] = 0

        return attrs
        
class PropiedadConFotosSerializer(serializers.ModelSerializer):
    fotos = serializers.SerializerMethodField()
    estado = serializers.SerializerMethodField() 

    class Meta:
        model = Propiedad
        fields = "__all__"

    def get_estado(self, obj):
        return calcular_estado_propiedad(obj)

    def get_fotos(self, obj):
        return [
            {
                "id": f.id,
                "url": f.foto.url if f.foto else None,
                "orden": f.orden,
                "principal": f.principal,
            }
            for f in obj.fotos.all().order_by("orden")
        ]


class PropiedadFotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = PropiedadFoto
        fields = ("id", "propiedad", "foto", "url", "orden", "principal")
        read_only_fields = ("id", "url")

    def get_url(self, obj):
        return obj.foto.url if obj.foto else None


class PropiedadDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropiedadDocumento
        fields = "__all__"

class InteresadoSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = Interesado
        fields = [
            "id",
            "primer_nombre", "segundo_nombre",
            "primer_apellido", "segundo_apellido",
            "rut", "telefono", "email",
            "fecha_registro",
            "usuario",
            "nombre_completo",
        ]

    def validate_rut(self, value):
        v = normalizar_rut(value)
        validar_rut(v)
        return v

    def validate_telefono(self, value):
        if value:
            validar_telefono_cl(value)
        return value


class InteresadoListSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Interesado
        fields = ("id", "nombre_completo", "rut", "email", "telefono")

    def get_nombre_completo(self, obj):
        try:
            nc = obj.nombre_completo
            if nc:
                return nc
        except Exception:
            pass

        parts = []
        for k in ["primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido"]:
            v = getattr(obj, k, "") or ""
            if v.strip():
                parts.append(v.strip())
        return " ".join(parts).strip() or "Sin nombre"

class VisitaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visita
        fields = "__all__"

    def validate(self, attrs):
        from .utils import slots_futuro
        
        fecha = attrs.get("fecha", getattr(self.instance, "fecha", None))
        hora = attrs.get("hora", getattr(self.instance, "hora", None))
        propiedad = attrs.get("propiedad", getattr(self.instance, "propiedad", None))
        interesado = attrs.get("interesado", getattr(self.instance, "interesado", None))

        hoy = timezone.localdate()
        delta = (fecha - hoy).days
        if delta < 0 or delta > VENTANA_FUTURA_MAX_DIAS:
            raise serializers.ValidationError(f"La fecha debe estar entre hoy y {VENTANA_FUTURA_MAX_DIAS} días en el futuro.")
        if fecha.weekday() > 4:
            raise serializers.ValidationError("Las visitas solo se pueden agendar de lunes a viernes.")
        if Feriado.objects.filter(fecha=fecha).exists():
            raise serializers.ValidationError("No se puede agendar en días feriados.")
        if hora not in INTERVALO_PERMITIDOS:
            raise serializers.ValidationError("La hora debe ser un slot válido: 09–13 o 16–18 (en punto).")
        if not slots_futuro(fecha, hora):
            raise serializers.ValidationError("La hora seleccionada ya pasó o está fuera del margen mínimo.")

        dup = Visita.objects.filter(propiedad=propiedad, fecha=fecha, hora=hora)
        if self.instance:
            dup = dup.exclude(pk=self.instance.pk)
        if dup.exists():
            raise serializers.ValidationError("Ese horario ya está reservado para la propiedad.")

        activas = Visita.objects.filter(
            interesado=interesado,
            fecha__gte=hoy,
            estado__in=ESTADOS_ACTIVOS,
        ).exclude(pk=getattr(self.instance, "pk", None)).count()
        if activas >= MAX_VISITAS_ACTIVAS_POR_INTERESADO:
            raise serializers.ValidationError(f"Has alcanzado el límite de {MAX_VISITAS_ACTIVAS_POR_INTERESADO} visitas activas.")

        return attrs
    


class PagoSerializer(serializers.ModelSerializer):
    contrato = serializers.PrimaryKeyRelatedField(
        queryset=Contrato.objects.all(),
        write_only=True
    )

    contrato_id = serializers.IntegerField(source="contrato.id", read_only=True)
    propiedad = serializers.SerializerMethodField()
    cliente = serializers.SerializerMethodField()
    comprobante_url = serializers.SerializerMethodField()

    class Meta:
        model = Pago
        fields = [
            'id',
            'contrato',      
            'contrato_id',   
            'fecha',
            'monto',
            'medio',
            'notas',
            'propiedad',
            'cliente',
            'comprobante_url',
        ]

    def get_comprobante_url(self, obj):
        request = self.context.get('request')
        if obj.comprobante:
            url = obj.comprobante.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_propiedad(self, obj):
        p = obj.contrato.propiedad
        return {"id": p.id, "titulo": p.titulo, "ciudad": p.ciudad, "tipo": p.tipo} if p else None

    def get_cliente(self, obj):
        i = obj.contrato.comprador_arrendatario
        return {"id": i.id, "nombre": i.nombre_completo, "rut": i.rut} if i else None

# ----------------- CUOTAS -----------------
class CuotaContratoSerializer(serializers.ModelSerializer):
    contrato_id = serializers.IntegerField(source="contrato.id", read_only=True)

    contrato = serializers.PrimaryKeyRelatedField(
        queryset=Contrato.objects.all(),
        write_only=True,
        required=True
    )

    comprobante_url = serializers.SerializerMethodField()
    class Meta:
        model = CuotaContrato
        fields = [
            "id",
            "contrato",        # write_only
            "contrato_id",     # read_only
            "vencimiento",
            "monto",
            "pagada",
            "pago",
            "comprobante",     
            "comprobante_url",  
        ]
        read_only_fields = ["id", "pagada", "pago", "contrato_id", "comprobante_url"]

    def get_comprobante_url(self, obj):
        if obj.comprobante:
            request = self.context.get("request")
            url = obj.comprobante.url
            return request.build_absolute_uri(url) if request else url
        return None
    
    
class PagarCuotaSerializer(serializers.Serializer):
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    fecha = serializers.DateField(required=False)
    medio = serializers.CharField(required=False, default="transferencia")
    notas = serializers.CharField(required=False, allow_blank=True)
    comprobante = serializers.FileField(required=False, allow_null=True)


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = "__all__"
        read_only_fields = ["id", "created_at", "usuario"]

class UsuarioRegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = ("id", "username", "email", "password", "rol")

    def create(self, validated_data):
        rol = validated_data.get("rol", "CLIENTE")
        user = Usuario(
            username=validated_data["username"],
            email=validated_data.get("email"),
            rol=rol,
        )
        if rol == "PROPIETARIO":
            user.aprobado = False
            user.is_active = True 
        user.set_password(validated_data["password"])
        user.save()
        return user
    


class MiniInteresadoSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.SerializerMethodField()

    class Meta:
        model = Interesado
        fields = ("id", "nombre_completo", "rut", "email", "telefono")

    def get_nombre_completo(self, obj):
        if hasattr(obj, "nombre_completo") and obj.nombre_completo:
            return obj.nombre_completo
        parts = []
        for k in ["primer_nombre", "segundo_nombre", "primer_apellido", "segundo_apellido"]:
            v = getattr(obj, k, "") or ""
            if v.strip():
                parts.append(v.strip())
        return " ".join(parts).strip() or "Sin nombre"


class SolicitudNotaAdminSerializer(serializers.ModelSerializer):
    autor_email = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudNotaAdmin
        fields = ("id", "texto", "created_at", "autor_email")

    def get_autor_email(self, obj):
        u = obj.creado_por
        return getattr(u, "email", None) if u else None


class SolicitudClienteAdminSerializer(serializers.ModelSerializer):
    interesado = MiniInteresadoSerializer(read_only=True)
    notas_admin = SolicitudNotaAdminSerializer(many=True, read_only=True)

    class Meta:
        model = SolicitudCliente
        fields = (
            "id",
            "interesado",
            "tipo_operacion",
            "tipo_propiedad",
            "ciudad",
            "comuna",
            "presupuesto_min",
            "presupuesto_max",
            "mensaje",
            "estado",
            "created_at",
            "notas_admin",
        )

class SolicitudClienteSerializer(serializers.ModelSerializer):
    interesado = MiniInteresadoSerializer(read_only=True)

    class Meta:
        model = SolicitudCliente
        fields = "__all__"
        read_only_fields = ("id", "created_at", "interesado")


class ContratoSerializer(serializers.ModelSerializer):
    propiedad = serializers.SerializerMethodField(read_only=True)
    comprador_arrendatario = serializers.SerializerMethodField(read_only=True)

    # escrituras (crear/editar desde front)
    propiedad_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    comprador_arrendatario_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    # archivos
    archivo_pdf_url = serializers.SerializerMethodField(read_only=True)

    # calculados
    total_pagos = serializers.SerializerMethodField(read_only=True)
    saldo = serializers.SerializerMethodField(read_only=True)
    proxima_cuota = serializers.SerializerMethodField(read_only=True)
    ultima_cuota_pagada = serializers.SerializerMethodField(read_only=True)
    cuotas_pendientes_count = serializers.SerializerMethodField()
    tipo_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Contrato
        fields = [
            "id",
            "tipo",
            "tipo_display",
            "fecha_firma",
            "vigente",
            "precio_pactado",

            "propiedad",
            "comprador_arrendatario",

            "propiedad_id",
            "comprador_arrendatario_id",

            "archivo_pdf",
            "archivo_pdf_url",

            "total_pagos",
            "saldo",

            "proxima_cuota",
            "ultima_cuota_pagada",
            "cuotas_pendientes_count",
        ]

    # ---------------- getters ----------------
    def get_tipo_display(self, obj):
        return obj.get_tipo_display() if obj.tipo else ""

    def get_archivo_pdf_url(self, obj):
        request = self.context.get("request")
        if obj.archivo_pdf:
            url = obj.archivo_pdf.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_propiedad(self, obj):
        p = getattr(obj, "propiedad", None)
        if not p:
            return None
        return {
            "id": p.id,
            "titulo": getattr(p, "titulo", ""),
            "ciudad": getattr(p, "ciudad", ""),
            "tipo": getattr(p, "tipo", ""),
            "precio": getattr(p, "precio", None),
        }

    def get_comprador_arrendatario(self, obj):
        i = getattr(obj, "comprador_arrendatario", None)
        if not i:
            return None
        return {
            "id": i.id,
            "rut": getattr(i, "rut", ""),
            "nombre_completo": getattr(i, "nombre_completo", ""),
            "email": getattr(i, "email", ""),
            "telefono": getattr(i, "telefono", ""),
        }

   
    def get_total_pagos(self, obj):
        return obj.pagos.aggregate(total=Sum("monto"))["total"] or 0

    def get_saldo(self, obj):
        if obj.tipo == "venta":
            total_pagos = obj.pagos.aggregate(total=Sum("monto"))["total"] or 0
            return max(obj.precio_pactado - total_pagos, 0)

        # arriendo: suma de cuotas pendientes
        total_pendiente = obj.cuotas.filter(pagada=False).aggregate(total=Sum("monto"))["total"] or 0
        return total_pendiente



    def get_cuotas_pendientes_count(self, obj):
        return obj.cuotas.filter(pagada=False).count()

    def get_proxima_cuota(self, obj):
        if obj.tipo != "arriendo":
            return None
        cuota = obj.cuotas.filter(pagada=False).order_by("vencimiento").first()
        if not cuota:
            return None
        return {
            "id": cuota.id,
            "vencimiento": cuota.vencimiento,
            "monto": cuota.monto,
            "pagada": cuota.pagada,
        }

    def get_ultima_cuota_pagada(self, obj):
        if obj.tipo != "arriendo":
            return None
        cuota = obj.cuotas.filter(pagada=True).order_by("-vencimiento").first()
        if not cuota:
            return None
        return {
            "id": cuota.id,
            "vencimiento": cuota.vencimiento,
            "monto": cuota.monto,
            "pagada": cuota.pagada,
            "pago_id": cuota.pago_id,
        }

    # ---------------- create/update ----------------
    def create(self, validated_data):
        prop_id = validated_data.pop("propiedad_id", None)
        int_id = validated_data.pop("comprador_arrendatario", None)

        if prop_id is not None:
            validated_data["propiedad_id"] = prop_id
        if int_id is not None:
            validated_data["comprador_arrendatario"] = int_id

        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("propiedad_id", None)
        validated_data.pop("comprador_arrendatario", None)
        return super().update(instance, validated_data)

    

class ContratoWriteSerializer(serializers.ModelSerializer):
    propiedad_id = serializers.PrimaryKeyRelatedField(
        source="propiedad", queryset=Propiedad.objects.all(), write_only=True
    )
    comprador_arrendatario_id = serializers.PrimaryKeyRelatedField(
        source="comprador_arrendatario", queryset=Interesado.objects.all(), write_only=True
    )

    class Meta:
        model = Contrato
        fields = (
            "id",
            "tipo",
            "propiedad_id",
            "comprador_arrendatario_id",
            "fecha_firma",
            "precio_pactado",
            "vigente",
            "archivo_pdf",
        )

    def validate(self, attrs):
        # propiedad puede venir o no en PATCH
        propiedad = attrs.get("propiedad", getattr(self.instance, "propiedad", None))
        vigente = attrs.get("vigente", getattr(self.instance, "vigente", True))

        # si no hay propiedad aún, no validar esto
        if not propiedad:
            return attrs

        # solo bloquear si el contrato quedará vigente
        if vigente:
            qs = Contrato.objects.filter(propiedad=propiedad, vigente=True)

            # si es update, excluir el mismo contrato
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)

            if qs.exists():
                raise serializers.ValidationError("Esta propiedad ya tiene un contrato vigente.")

        return attrs

# ----------------- DOCUMENTOS DE CONTRATO -----------------
class ContratoDocumentoSerializer(serializers.ModelSerializer):
    archivo_url = serializers.SerializerMethodField(read_only=True)
    subido_por_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ContratoDocumento
        fields = [
            "id",
            "contrato",
            "tipo",
            "nombre",
            "archivo",
            "archivo_url",
            "created_at",
            "subido_por",
            "subido_por_username",
        ]
        read_only_fields = ["id", "created_at", "subido_por", "subido_por_username"]

    def get_archivo_url(self, obj):
        if not obj.archivo:
            return None

        request = self.context.get("request")
        url = obj.archivo.url 

        if request:
            return request.build_absolute_uri(url) 

        return f"http://127.0.0.1:8000{url}"

    def get_subido_por_username(self, obj):
        return getattr(obj.subido_por, "username", None)
        
class ReservaSerializer(serializers.ModelSerializer):
    propiedad = MiniPropiedadSerializer(read_only=True)
    interesado = MiniInteresadoSerializer(read_only=True)

    propiedad_id = serializers.PrimaryKeyRelatedField(
        queryset=Propiedad.objects.all(),
        write_only=True,
        source="propiedad",
    )

    vencida = serializers.SerializerMethodField()
    estado_reserva = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = (
            "id",
            "propiedad",
            "propiedad_id",
            "interesado",
            "creada_por",
            "fecha",
            "expires_at",
            "monto_reserva",
            "notas",
            "activa",
            "estado",        
            "vencida",
            "estado_reserva", 
        )
        read_only_fields = (
            "id",
            "fecha",
            "activa",
            "creada_por",
            "interesado",
            "propiedad",
            "estado",
        )

    def get_vencida(self, obj):
        return bool(obj.expires_at and obj.expires_at <= timezone.now())

    def get_estado_reserva(self, obj):
        # Si en BD está cancelada, respeta eso
        if obj.estado == "cancelada":
            return "cancelada"

        # Si está vencida por fecha, muéstrala como expirada
        if obj.expires_at and obj.expires_at <= timezone.now():
            return "expirada"


        return obj.estado
    
    
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['email'] = user.email
        token['rol'] = getattr(user, 'rol', 'CLIENTE') 
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['email'] = self.user.email
        data['rol'] = getattr(self.user, 'rol', 'CLIENTE')
        return data
    

class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Historial
        fields = ["id", "usuario", "fecha", "accion", "descripcion"]

class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(required=True)
    password_nueva = serializers.CharField(required=True, min_length=8)




