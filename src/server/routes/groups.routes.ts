import { errorGuard } from '@/server/middleware/errorGuard';
import { groupService } from '@/server/services/group.service';
import type { Group, GroupCreateInput } from '@/shared/types/group';

export const groupsRoutes = {
  create: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as GroupCreateInput;
    const result = await groupService.create(body);
    return Response.json({ ok: true, id: result.id });
  }),

  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { id: string };
    const result = await groupService.get(body.id);
    return Response.json(result);
  }),

  all: errorGuard(async (req: Request): Promise<Response> => {
    const result = await groupService.getAll();
    return Response.json(result);
  }),

  update: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string; data: Partial<Group> };
    await groupService.update(body.id, body.data);
    return Response.json({ ok: true });
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string };
    await groupService.delete(body.id);
    return Response.json({ ok: true });
  }),

  addMember: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string; characterFileName: string };
    await groupService.addMember(body.id, body.characterFileName);
    return Response.json({ ok: true });
  }),

  removeMember: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string; characterFileName: string };
    await groupService.removeMember(body.id, body.characterFileName);
    return Response.json({ ok: true });
  }),

  import: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as GroupCreateInput & { id?: string };
    const result = await groupService.importGroup(body);
    return Response.json({ ok: true, id: result.id });
  }),

  export: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string };
    const result = await groupService.exportGroup(body.id);
    return new Response(result.data, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
      },
    });
  }),
};
