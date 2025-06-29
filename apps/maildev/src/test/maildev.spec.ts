import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { createTransport, type Transporter } from 'nodemailer';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('mailcatcher', () => {
  [currentArch()].map((arch) => {
    describe(`arch: ${arch}`, () => {
      let container: StartedTestContainer;
      let httpPort: number;
      let smtpPort: number;
      let transport: Transporter;

      beforeAll(async () => {
        container = await new GenericContainer(`philiplehmann/maildev:test-${arch}`)
          .withExposedPorts(1080, 1025)
          .withLogConsumer((stream) => stream.pipe(process.stdout))
          .start();

        httpPort = container.getMappedPort(1080);
        smtpPort = container.getMappedPort(1025);
        transport = createTransport({ host: 'localhost', port: smtpPort });
      });

      afterAll(async () => {
        await container?.stop();
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
          path: '/email',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = JSON.parse(text);

        expect(response.statusCode).toBe(200);
        expect(data.length).toBe(1);
        expect(data[0].text.trim()).toMatch('test text content');
        expect(data[0]).toMatchObject({
          from: [{ address: 'sender@example.local' }],
          to: [{ address: 'receiver@example.local' }],
          subject: 'test subject',
        });
      });
    });
  });
});
