import { v4 as uuidv4 } from 'uuid';

export function getVisitorId(): string {
  let id = localStorage.getItem('visitorId') || '';
  if (!id) {
    id = uuidv4();
    localStorage.setItem('visitorId', id);
  }
  return id;
}

export function getSessionVisitorId(): string {
  let id = sessionStorage.getItem('sessionVisitorId') || '';
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem('sessionVisitorId', id);
  }
  return id;
}
// If you get a type error for uuid, run: npm i --save-dev @types/uuid
