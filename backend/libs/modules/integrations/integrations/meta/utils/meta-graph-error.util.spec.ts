import {
  getMetaGraphErrorMessage,
  parseMetaGraphErrorPayload,
} from './meta-graph-error.util';

describe('meta-graph-error.util', () => {
  it('parses Meta Graph error payloads', () => {
    const parsed = parseMetaGraphErrorPayload(
      'Meta create message template failed: {"error":{"message":"Invalid parameter","type":"OAuthException","code":100,"error_subcode":2388155,"error_user_title":"Template name is already used as a sample template","error_user_msg":"This template is named after a sample template created by default. Please use a different name."}}',
    );

    expect(parsed?.errorUserMsg).toBe(
      'This template is named after a sample template created by default. Please use a different name.',
    );
    expect(parsed?.errorSubcode).toBe(2388155);
  });

  it('extracts user-facing messages from thrown errors', () => {
    const message = getMetaGraphErrorMessage(
      new Error(
        'Meta create message template failed: {"error":{"message":"Invalid parameter","error_user_msg":"Please use a different name."}}',
      ),
    );

    expect(message).toBe('Please use a different name.');
  });
});
