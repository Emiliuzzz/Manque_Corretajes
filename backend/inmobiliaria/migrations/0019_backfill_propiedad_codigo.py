from django.db import migrations

def generar_codigos(apps, schema_editor):
    Propiedad = apps.get_model('inmobiliaria', 'Propiedad')
    for p in Propiedad.objects.all().only('id', 'codigo'):
        if not p.codigo:
            p.codigo = f"MAN-{p.id:06d}"
            p.save(update_fields=['codigo'])

class Migration(migrations.Migration):

    dependencies = [
        ('inmobiliaria', '0018_propiedad_codigo'),  # ajusta si tu número cambió
    ]

    operations = [
        migrations.RunPython(generar_codigos, migrations.RunPython.noop),
    ]
