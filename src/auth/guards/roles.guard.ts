import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

type AuthenticatedUser = {
  role?: string | { name?: string };
};

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = this.getRoleName(request.user);

    if (!userRole) {
      throw new ForbiddenException(
        'No tienes un rol válido para acceder a este recurso',
      );
    }

    if (userRole === 'superadmin' || requiredRoles.includes(userRole as Role)) {
      return true;
    }

    throw new ForbiddenException(
      'No tienes permisos suficientes para acceder a este recurso',
    );
  }

  private getRoleName(user?: AuthenticatedUser): string | undefined {
    const role = user?.role;
    const roleName = typeof role === 'string' ? role : role?.name;

    return roleName?.trim().toLowerCase();
  }
}
