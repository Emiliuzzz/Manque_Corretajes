from django.apps import AppConfig

class InmobiliariaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "inmobiliaria"

    def ready(self):
        print("InmobiliariaConfig.ready() ejecutado")
        import inmobiliaria.signals
        print("inmobiliaria.signals importado")
