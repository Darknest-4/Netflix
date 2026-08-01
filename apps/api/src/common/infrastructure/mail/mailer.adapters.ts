import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import type { MailMessage, MailerPort } from '../../application/ports';

/**
 * SMTP adapter used when `SMTP_HOST` is configured.
 *
 * Works with any provider (Postmark, SES, Mailgun, self-hosted Postfix).
 */
@Injectable()
export class SmtpMailerAdapter implements MailerPort {
  private readonly logger = new Logger(SmtpMailerAdapter.name);
  private readonly transporter: Transporter;

  /**
   * @param options - SMTP connection details and default sender.
   */
  public constructor(
    private readonly options: {
      host: string;
      port: number;
      user: string | null;
      password: string | null;
      from: string;
    },
  ) {
    this.transporter = createTransport({
      host: options.host,
      port: options.port,
      secure: options.port === 465,
      auth:
        options.user && options.password
          ? { user: options.user, pass: options.password }
          : undefined,
    });
  }

  /** @inheritdoc */
  public async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.options.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    this.logger.log(`E-mail elküldve: ${message.subject} → ${message.to}`);
  }
}

/**
 * Development mailer.
 *
 * Writes the rendered message to the application log instead of delivering it,
 * so the signup and billing flows work without any mail infrastructure.
 */
@Injectable()
export class ConsoleMailerAdapter implements MailerPort {
  private readonly logger = new Logger(ConsoleMailerAdapter.name);

  /** @inheritdoc */
  public async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `[DEV MAIL] → ${message.to} | ${message.subject}\n${message.text.slice(0, 400)}`,
    );
  }
}
