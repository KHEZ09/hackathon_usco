from .connection import transaction


class UnitOfWork:
    def __enter__(self):
        self._context = transaction()
        self.connection = self._context.__enter__()
        return self

    def __exit__(self, *args):
        return self._context.__exit__(*args)
