from app.integrations.base_client import IntegrationClient
from app.integrations.mappers import validate_supplier


def test_integration_client_normalizes_base_url():
    client = IntegrationClient('https://example.test///')
    assert client.base_url == 'https://example.test'


def test_invalid_external_supplier_is_rejected():
    try:
        validate_supplier({'municipio': 'Pitalito'})
    except ValueError as error:
        assert 'nombre' in str(error)
    else:
        raise AssertionError('Debió rechazar proveedor sin nombre')
