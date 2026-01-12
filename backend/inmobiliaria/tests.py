from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from inmobiliaria.models import (
    Usuario, Propietario, Propiedad, Contrato, Reserva, Pago, Interesado
)


class PropietarioAPITestCase(APITestCase):
    """
    Pruebas unitarias para verificar que el propietario puede ver:
    - Su perfil
    - Sus propiedades
    - Sus contratos
    - Sus reservas
    - Sus pagos
    """

    @classmethod
    def setUpTestData(cls):
        """Configurar datos de prueba una vez para todas las pruebas."""
        # Usar el propietario2 existente
        cls.usuario = Usuario.objects.get(email='propietario2@test.com')
        cls.propietario = Propietario.objects.get(usuario=cls.usuario)

        # Obtener propiedades del propietario
        cls.propiedades = list(Propiedad.objects.filter(propietario=cls.propietario))

        # Obtener contratos de sus propiedades
        cls.contratos = list(Contrato.objects.filter(
            propiedad__propietario=cls.propietario
        ))

        # Obtener reservas de sus propiedades
        cls.reservas = list(Reserva.objects.filter(
            propiedad__propietario=cls.propietario
        ))

        # Obtener pagos de sus contratos
        cls.pagos = list(Pago.objects.filter(
            contrato__propiedad__propietario=cls.propietario
        ))

    def setUp(self):
        """Configurar cliente autenticado para cada prueba."""
        self.client = APIClient()
        # Generar token JWT para el usuario
        refresh = RefreshToken.for_user(self.usuario)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    # ==================== PRUEBAS DE PERFIL ====================

    def test_propietario_puede_ver_su_perfil(self):
        """El propietario puede obtener su información de perfil."""
        response = self.client.get('/api/propietario/mi-perfil/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('primer_nombre', response.data)
        self.assertIn('primer_apellido', response.data)
        self.assertEqual(response.data['rut'], self.propietario.rut)

    def test_propietario_puede_actualizar_su_perfil(self):
        """El propietario puede actualizar su información de perfil."""
        data = {
            'telefono': '+56912345678',
            'primer_nombre': self.propietario.primer_nombre,
            'primer_apellido': self.propietario.primer_apellido,
        }
        response = self.client.put('/api/propietario/mi-perfil/', data)

        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

    # ==================== PRUEBAS DE PROPIEDADES ====================

    def test_propietario_puede_ver_sus_propiedades(self):
        """El propietario puede listar sus propiedades."""
        response = self.client.get('/api/propietario/mis-propiedades/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Manejar respuesta paginada o lista directa
        if isinstance(response.data, dict) and 'results' in response.data:
            propiedades = response.data['results']
        else:
            propiedades = response.data

        self.assertIsInstance(propiedades, list)
        self.assertEqual(len(propiedades), len(self.propiedades))

    def test_propietario_solo_ve_sus_propiedades(self):
        """El propietario solo ve propiedades que le pertenecen."""
        response = self.client.get('/api/propietario/mis-propiedades/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            propiedades = response.data['results']
        else:
            propiedades = response.data

        # Verificar que todas las propiedades pertenecen al propietario
        propiedades_ids = [p['id'] for p in propiedades]
        for prop_id in propiedades_ids:
            propiedad = Propiedad.objects.get(id=prop_id)
            self.assertEqual(propiedad.propietario_id, self.propietario.id)

    # ==================== PRUEBAS DE CONTRATOS ====================

    def test_propietario_puede_ver_sus_contratos(self):
        """El propietario puede listar contratos de sus propiedades."""
        response = self.client.get('/api/propietario/mis-contratos/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            contratos = response.data['results']
        else:
            contratos = response.data

        self.assertIsInstance(contratos, list)
        self.assertEqual(len(contratos), len(self.contratos))

    def test_propietario_solo_ve_contratos_de_sus_propiedades(self):
        """El propietario solo ve contratos de propiedades que le pertenecen."""
        response = self.client.get('/api/propietario/mis-contratos/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            contratos = response.data['results']
        else:
            contratos = response.data

        # Verificar que todos los contratos son de sus propiedades
        for contrato_data in contratos:
            contrato = Contrato.objects.get(id=contrato_data['id'])
            self.assertEqual(contrato.propiedad.propietario_id, self.propietario.id)

    def test_contratos_tienen_informacion_completa(self):
        """Los contratos incluyen información relevante."""
        response = self.client.get('/api/propietario/mis-contratos/')

        if len(self.contratos) > 0:
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            if isinstance(response.data, dict) and 'results' in response.data:
                contratos = response.data['results']
            else:
                contratos = response.data

            if contratos:
                contrato = contratos[0]
                # Verificar campos esperados
                self.assertIn('id', contrato)
                self.assertIn('tipo', contrato)

    # ==================== PRUEBAS DE RESERVAS ====================

    def test_propietario_puede_ver_sus_reservas(self):
        """El propietario puede listar reservas de sus propiedades."""
        response = self.client.get('/api/propietario/mis-reservas/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            reservas = response.data['results']
        else:
            reservas = response.data

        self.assertIsInstance(reservas, list)
        self.assertEqual(len(reservas), len(self.reservas))

    def test_propietario_solo_ve_reservas_de_sus_propiedades(self):
        """El propietario solo ve reservas de propiedades que le pertenecen."""
        response = self.client.get('/api/propietario/mis-reservas/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            reservas = response.data['results']
        else:
            reservas = response.data

        # Verificar que todas las reservas son de sus propiedades
        for reserva_data in reservas:
            reserva = Reserva.objects.get(id=reserva_data['id'])
            self.assertEqual(reserva.propiedad.propietario_id, self.propietario.id)

    def test_reservas_tienen_estado(self):
        """Las reservas incluyen información de estado."""
        response = self.client.get('/api/propietario/mis-reservas/')

        if len(self.reservas) > 0:
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            if isinstance(response.data, dict) and 'results' in response.data:
                reservas = response.data['results']
            else:
                reservas = response.data

            if reservas:
                reserva = reservas[0]
                self.assertIn('estado', reserva)

    # ==================== PRUEBAS DE PAGOS ====================

    def test_propietario_puede_ver_sus_pagos(self):
        """El propietario puede listar pagos de sus contratos."""
        response = self.client.get('/api/propietario/mis-pagos/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            pagos = response.data['results']
        else:
            pagos = response.data

        self.assertIsInstance(pagos, list)
        self.assertEqual(len(pagos), len(self.pagos))

    def test_propietario_solo_ve_pagos_de_sus_propiedades(self):
        """El propietario solo ve pagos de contratos de sus propiedades."""
        response = self.client.get('/api/propietario/mis-pagos/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        if isinstance(response.data, dict) and 'results' in response.data:
            pagos = response.data['results']
        else:
            pagos = response.data

        # Verificar que todos los pagos son de sus propiedades
        for pago_data in pagos:
            pago = Pago.objects.get(id=pago_data['id'])
            self.assertEqual(pago.contrato.propiedad.propietario_id, self.propietario.id)

    def test_pagos_tienen_monto(self):
        """Los pagos incluyen información de monto."""
        response = self.client.get('/api/propietario/mis-pagos/')

        if len(self.pagos) > 0:
            self.assertEqual(response.status_code, status.HTTP_200_OK)

            if isinstance(response.data, dict) and 'results' in response.data:
                pagos = response.data['results']
            else:
                pagos = response.data

            if pagos:
                pago = pagos[0]
                self.assertIn('monto', pago)

    # ==================== PRUEBAS DE SEGURIDAD ====================

    def test_usuario_no_autenticado_no_puede_acceder(self):
        """Un usuario no autenticado no puede acceder a los endpoints."""
        # Remover credenciales
        self.client.credentials()

        endpoints = [
            '/api/propietario/mi-perfil/',
            '/api/propietario/mis-propiedades/',
            '/api/propietario/mis-contratos/',
            '/api/propietario/mis-reservas/',
            '/api/propietario/mis-pagos/',
        ]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Endpoint {endpoint} debería requerir autenticación"
            )


class PropietarioSinDatosTestCase(APITestCase):
    """
    Pruebas para propietario sin contratos/reservas/pagos.
    """

    @classmethod
    def setUpTestData(cls):
        # Usar propietario3 que tiene menos datos
        cls.usuario = Usuario.objects.get(email='propietario3@test.com')
        cls.propietario = Propietario.objects.get(usuario=cls.usuario)

    def setUp(self):
        self.client = APIClient()
        refresh = RefreshToken.for_user(self.usuario)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_propietario_puede_ver_lista_vacia_sin_error(self):
        """El propietario puede acceder aunque no tenga datos."""
        endpoints = [
            '/api/propietario/mis-propiedades/',
            '/api/propietario/mis-contratos/',
            '/api/propietario/mis-reservas/',
            '/api/propietario/mis-pagos/',
        ]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(
                response.status_code,
                status.HTTP_200_OK,
                f"Endpoint {endpoint} debería retornar 200 OK"
            )
