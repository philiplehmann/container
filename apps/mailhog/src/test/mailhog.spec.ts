import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { testRequest } from '@container/test/request';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createTransport, type Transporter } from 'nodemailer';
import { currentArch } from '@container/docker';

describe('mailhog', () => {
  [currentArch()].map((arch) => {
    describe(`arch: ${arch}`, () => {
      let container: StartedTestContainer;
      let httpPort: number;
      let smtpPort: number;
      let transport: Transporter;

      beforeAll(async () => {
        container = await new GenericContainer(`philiplehmann/mailhog:test-${arch}`)
          .withExposedPorts(8025, 1025)
          .withLogConsumer((stream) => stream.pipe(process.stdout))
          .start();

        httpPort = container.getMappedPort(8025);
        smtpPort = container.getMappedPort(1025);
        transport = createTransport({ host: 'localhost', port: smtpPort });
      });

      afterAll(async () => {
        await container.stop();
      });

      it('should receive email', async () => {
        const mailOptions = {
          from: 'sender@example.local',
          to: 'receiver@example.local',
          subject: 'test subject',
          text: 'test text content',
        };
        await transport.sendMail(mailOptions);

        const [response, text] = await testRequest({
          method: 'GET',
          host: 'localhost',
          port: httpPort,
          path: '/api/v2/messages',
        });
        const data = JSON.parse(text);

        expect(response.statusCode).toBe(200);
        expect(data.items.length).toBe(1);
        expect(data.items[0]).toMatchObject({
          Content: {
            Headers: {
              From: ['sender@example.local'],
              To: ['receiver@example.local'],
              Subject: ['test subject'],
            },
            Body: 'test text content',
          },
        });
      });
    });
  });
});
