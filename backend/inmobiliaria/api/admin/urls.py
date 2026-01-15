from django.urls import path
from .views import (
    # Dashboard
    admin_resumen,

    # Usuarios
    admin_usuarios_list,
    admin_usuario_detail,
    admin_usuario_crear_perfil,
    admin_usuario_desactivar,
    admin_usuario_activar,

    # Propietarios
    AdminPropietarioListCreateView,
    AdminPropietarioRetrieveUpdateView,

    # Propiedades
    AdminPropiedadListCreateView,
    AdminPropiedadRetrieveUpdateView,

    # Solicitudes (NUEVO FLUJO)
    admin_solicitudes_list,
    admin_solicitudes_kpis,
    admin_solicitud_detalle,
    admin_solicitud_cambiar_estado,
    admin_solicitud_agregar_nota,
    admin_solicitud_enviar_mensaje,

    # Reservas
    AdminReservaListView,
    admin_reserva_detalle,
    admin_reserva_agregar_nota,
    admin_reserva_enviar_mensaje,
    admin_reserva_cambiar_estado,

    # Selectores para formularios
    admin_propiedades_disponibles,
    admin_interesados_clientes,
)

urlpatterns = [
    # =====================
    # DASHBOARD
    # =====================
    path("resumen/", admin_resumen),

    # =====================
    # USUARIOS
    # =====================
    path("usuarios/", admin_usuarios_list),
    path("usuarios/<int:pk>/", admin_usuario_detail),
    path("usuarios/<int:pk>/crear-perfil/", admin_usuario_crear_perfil),
    path("usuarios/<int:pk>/desactivar/", admin_usuario_desactivar),
    path("usuarios/<int:pk>/activar/", admin_usuario_activar),

    # =====================
    # PROPIETARIOS
    # =====================
    path("propietarios/", AdminPropietarioListCreateView.as_view()),
    path("propietarios/<int:pk>/", AdminPropietarioRetrieveUpdateView.as_view()),

    # =====================
    # PROPIEDADES
    # =====================
    path("propiedades/", AdminPropiedadListCreateView.as_view()),
    path("propiedades/<int:pk>/", AdminPropiedadRetrieveUpdateView.as_view()),

    # =====================
    # SOLICITUDES (CLIENTES)
    # =====================
    path("solicitudes/kpis/", admin_solicitudes_kpis),
    path("solicitudes/", admin_solicitudes_list),
    path("solicitudes/<int:pk>/", admin_solicitud_detalle),
    path("solicitudes/<int:pk>/cambiar-estado/", admin_solicitud_cambiar_estado),
    path("solicitudes/<int:pk>/notas/", admin_solicitud_agregar_nota),
    path("solicitudes/<int:pk>/enviar-mensaje/", admin_solicitud_enviar_mensaje),

    # =====================
    # RESERVAS
    # =====================
    path("reservas/", AdminReservaListView.as_view()),
    path("reservas/<int:pk>/", admin_reserva_detalle),
    path("reservas/<int:pk>/agregar-nota/", admin_reserva_agregar_nota),
    path("reservas/<int:pk>/enviar-mensaje/", admin_reserva_enviar_mensaje),
    path("reservas/<int:pk>/cambiar-estado/", admin_reserva_cambiar_estado),

    # =====================
    # SELECTORES PARA FORMULARIOS
    # =====================
    path("propiedades-disponibles/", admin_propiedades_disponibles),
    path("interesados-clientes/", admin_interesados_clientes),

]
