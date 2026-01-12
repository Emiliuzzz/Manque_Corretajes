from django.urls import path
from .views import ReporteResumenAPIView

urlpatterns = [
    path("resumen/", ReporteResumenAPIView.as_view(), name="reporte_resumen"),
]
