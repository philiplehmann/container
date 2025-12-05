import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';
import { currentArch } from '@container/docker';
import { testRequest } from '@container/test/request';
import { createTransport, type Transporter } from 'nodemailer';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

describe('mailcatcher', () => {
  [currentArch()].forEach((arch) => {
    describe(`arch: ${arch}`, () => {
      let container: StartedTestContainer;
      let httpPort: number;
      let smtpPort: number;
      let transport: Transporter;

      before(async () => {
        container = await new GenericContainer(`philiplehmann/maildev:test-${arch}`)
          .withExposedPorts(1080, 1025)
          .withLogConsumer((stream) => stream.pipe(process.stdout))
          .start();

        httpPort = container.getMappedPort(1080);
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
          path: '/email',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = JSON.parse(text);

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(data.length, 1);
        assert.match(data[0].text.trim(), /test text content/);
        assert.deepStrictEqual(data[0].from, [{ address: 'sender@example.local', name: '' }]);
        assert.deepStrictEqual(data[0].to, [{ address: 'receiver@example.local', name: '' }]);
        assert.strictEqual(data[0].subject, 'test subject');
      });
    });
  });
});
