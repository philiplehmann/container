import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { createTransport, type Transporter } from 'nodemailer';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

describe('mailhog', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      let container: StartedTestContainer;
      let httpPort: number;
      let smtpPort: number;
      let transport: Transporter;

      before(async () => {
        container = await new GenericContainer(`philiplehmann/mailhog:test-${arch}`)
          .withExposedPorts(8025, 1025)
          .withLogConsumer((stream) => stream.pipe(process.stdout))
          .start();

        httpPort = container.getMappedPort(8025);
        smtpPort = container.getMappedPort(1025);
        transport = createTransport({ host: 'localhost', port: smtpPort });
      });

      after(async () => {
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

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(data.items.length, 1);
        assert.deepStrictEqual(data.items[0].Content.Headers.From, ['sender@example.local']);
        assert.deepStrictEqual(data.items[0].Content.Headers.To, ['receiver@example.local']);
        assert.deepStrictEqual(data.items[0].Content.Headers.Subject, ['test subject']);
        assert.strictEqual(data.items[0].Content.Body, 'test text content');
      });
    });
  });
});
