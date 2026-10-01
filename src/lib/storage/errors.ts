export class RecordNotFoundError extends Error {
  constructor(entityName: string, id: string) {
    super(`${entityName} record "${id}" was not found.`);
    this.name = 'RecordNotFoundError';
  }
}

export class RelationshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RelationshipError';
  }
}
