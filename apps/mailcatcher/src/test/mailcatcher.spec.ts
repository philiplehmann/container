import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { testRequest } from '@container/test/request';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { createTransport, type Transporter } from 'nodemailer';
import { currentArch } from '@container/docker';

describe('mailcatcher', () => {
  [currentArch()].map((arch) => {
    describe(`arch: ${arch}`, () => {
      let container: StartedTestContainer;
      let httpPort: number;
      let smtpPort: number;
      let transport: Transporter;

      beforeAll(async () => {
        container = await new GenericContainer(`philiplehmann/mailcatcher:test-${arch}`)
          .withExposedPorts(1080, 1025)
          .withLogConsumer((stream) => stream.pipe(process.stdout))
          .start();

        httpPort = container.getMappedPort(1080);
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
          path: '/messages',
        });
        const data = JSON.parse(text);

        expect(response.statusCode).toBe(200);
        expect(data.length).toBe(1);
        expect(data[0]).toMatchObject({
          sender: '<sender@example.local>',
          recipients: ['<receiver@example.local>'],
          subject: 'test subject',
        });

        const [responseDetail, textDetail] = await testRequest({
          method: 'GET',
          host: 'localhost',
          port: httpPort,
          path: '/messages/1.plain',
        });

        expect(responseDetail.statusCode).toBe(200);
        expect(textDetail.trim()).toBe('test text content');
      });
    });
  });
});
