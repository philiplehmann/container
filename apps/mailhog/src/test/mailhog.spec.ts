import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { createTransport, type Transporter } from 'nodemailer';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';

describe('mailhog', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      let container: StartedTestContainer;
      let httpPort: number;
      let smtpPort: number;
      let transport: Transporter;

      beforeAll(
        async () => {
          container = await new GenericContainer(`philiplehmann/mailhog:test-${arch}`)
            .withUser('1000:1000')
            .withLogConsumer((stream) => stream.pipe(process.stdout))
            .withWaitStrategy(Wait.forHttp('/', 8025).forStatusCode(200))
            .withExposedPorts(8025, 1025)
            .withLogConsumer((stream) => stream.pipe(process.stdout))
            .start();

          httpPort = container.getMappedPort(8025);
          smtpPort = container.getMappedPort(1025);
          transport = createTransport({ host: 'localhost', port: smtpPort });
        },
        { timeout: 60_000 },
      );

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
