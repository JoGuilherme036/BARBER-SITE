// Cloudflare Pages Function: every /api/* request goes to the schedule API.
import { handle } from '../../server/api';
import type { Env } from '../../server/d1';

export const onRequest = (context: { request: Request; env: Env }) => handle(context.request, context.env);
