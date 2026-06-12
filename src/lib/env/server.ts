import {getClientEnv} from './client';

export function getServerEnv(source: NodeJS.ProcessEnv = process.env) {
  return {
    ...getClientEnv(source)
  };
}
