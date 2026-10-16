from app.integrations.mappers import validate_supplier
from app.integrations.retry_policy import with_retries


def test_supplier_response_is_normalized():
    assert validate_supplier({'nombre': 'Finca Demo', 'municipio': 'Pitalito'})['name'] == 'Finca Demo'


def test_retry_policy_retries_until_success():
    calls = {'count': 0}

    def operation():
        calls['count'] += 1
        if calls['count'] < 3: raise RuntimeError('temporary')
        return 'ok'

    result, attempts = with_retries(operation, attempts=3, delay_seconds=0)
    assert result == 'ok'
    assert attempts == 3
