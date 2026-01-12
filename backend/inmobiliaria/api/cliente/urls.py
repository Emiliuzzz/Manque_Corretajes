from django.urls import path
from . import views

urlpatterns = [
    path("mi-perfil/", views.MiPerfilClienteView.as_view(), name="cliente-mi-perfil"),
    path("mis-solicitudes/", views.MisSolicitudesView.as_view(), name="cliente-mis-solicitudes"),
]
