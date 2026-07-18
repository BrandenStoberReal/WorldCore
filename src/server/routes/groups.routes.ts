import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { groupService } from '@/server/services/group.service';
import type { Group, GroupCreateInput } from '@/shared/types/group';

export const groupsRoutes = {
  create: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as GroupCreateInput;
      const result = await groupService.create(userId, body);
      return Response.json({ ok: true, id: result.id });
    }),
  ),

  get: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { id: string };
      const result = await groupService.get(userId, body.id);
      return Response.json(result);
    }),
  ),

  all: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const result = await groupService.getAll(userId);
      return Response.json(result);
    }),
  ),

  update: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string; data: Partial<Group> };
      await groupService.update(userId, body.id, body.data);
      return Response.json({ ok: true });
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string };
      await groupService.delete(userId, body.id);
      return Response.json({ ok: true });
    }),
  ),

  addMember: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string; characterFileName: string };
      await groupService.addMember(userId, body.id, body.characterFileName);
      return Response.json({ ok: true });
    }),
  ),

  removeMember: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string; characterFileName: string };
      await groupService.removeMember(userId, body.id, body.characterFileName);
      return Response.json({ ok: true });
    }),
  ),

  import: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as GroupCreateInput & { id?: string };
      const result = await groupService.importGroup(userId, body);
      return Response.json({ ok: true, id: result.id });
    }),
  ),

  export: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id: string };
      const result = await groupService.exportGroup(userId, body.id);
      return new Response(result.data, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
        },
      });
    }),
  ),
};
