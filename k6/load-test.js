import http from 'k6/http';
import { check, sleep } from 'k6';

// Defaults to localhost so `npm run test:load` works straight away against `npm run dev`/`start`;
// CI (load-test-cicd) overrides this with the deployed dev-slot URL. Only unauthenticated routes
// are exercised (see middleware.ts PUBLIC_PREFIXES/PUBLIC_EXACT) so no login flow is needed here.
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp up
    { duration: '1m', target: 20 }, // hold
    { duration: '30s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const responses = {
    home: http.get(`${BASE_URL}/`),
    map: http.get(`${BASE_URL}/map`),
    health: http.get(`${BASE_URL}/api/health`),
  };

  for (const [name, res] of Object.entries(responses)) {
    check(res, { [`${name}: status is 200`]: (r) => r.status === 200 });
  }

  sleep(1);
}
