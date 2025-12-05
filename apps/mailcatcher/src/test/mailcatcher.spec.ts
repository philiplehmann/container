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
        container = await new GenericContainer(`philiplehmann/mailcatcher:test-${arch}`)
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
          path: '/messages',
        });
        const data = JSON.parse(text);

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].sender, '<sender@example.local>');
        assert.deepStrictEqual(data[0].recipients, ['<receiver@example.local>']);
        assert.strictEqual(data[0].subject, 'test subject');

        const [responseDetail, textDetail] = await testRequest({
          method: 'GET',
          host: 'localhost',
          port: httpPort,
          path: '/messages/1.plain',
        });

        assert.strictEqual(responseDetail.statusCode, 200);
        assert.strictEqual(textDetail.trim(), 'test text content');
      });
    });
  });
});
