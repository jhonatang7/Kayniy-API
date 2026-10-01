import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') ?? '';

    if (!apiKey || !this.fromEmail) {
      throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL must be configured');
    }

    this.resend = new Resend(apiKey);
  }

  async sendTeacherWelcomeEmail(
    recipientEmail: string,
    firstName: string,
    temporaryPassword: string,
  ): Promise<void> {
    await this.sendWelcomeEmail(recipientEmail, firstName, temporaryPassword, 'profesor');
  }

  async sendAdminWelcomeEmail(
    recipientEmail: string,
    firstName: string,
    temporaryPassword: string,
  ): Promise<void> {
    await this.sendWelcomeEmail(recipientEmail, firstName, temporaryPassword, 'administrador');
  }

  private async sendWelcomeEmail(
    recipientEmail: string,
    firstName: string,
    temporaryPassword: string,
    roleName: string,
  ): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: recipientEmail,
      subject: `Bienvenido como ${roleName} a Kayniy`,
      text: [
        `Hola ${firstName},`,
        '',
        `Gracias por unirte como ${roleName} a nuestra plataforma de aprendizaje Kayniy.`,
        '',
        'Estas son tus credenciales temporales:',
        `Correo: ${recipientEmail}`,
        `Contraseña temporal: ${temporaryPassword}`,
        '',
        'Por seguridad, cambia tu contraseña después de iniciar sesión por primera vez.',
      ].join('\n'),
      html: `
        <p>Hola ${this.escapeHtml(firstName)},</p>
        <p>Gracias por unirte como ${this.escapeHtml(roleName)} a nuestra plataforma de aprendizaje Kayniy.</p>
        <p>Estas son tus credenciales temporales:</p>
        <ul>
          <li><strong>Correo:</strong> ${this.escapeHtml(recipientEmail)}</li>
          <li><strong>Contraseña temporal:</strong> ${this.escapeHtml(temporaryPassword)}</li>
        </ul>
        <p>Por seguridad, cambia tu contraseña después de iniciar sesión por primera vez.</p>
      `,
    });

    if (error) {
      throw new InternalServerErrorException('Could not send welcome email');
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(
      /[&<>'"]/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;',
        })[character] ?? character,
    );
  }
}
