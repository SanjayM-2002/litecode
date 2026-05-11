const PLACEHOLDER = '{{USER_CODE}}';

/**
 * Substitutes the user's submitted code into the driver template.
 * Throws if the placeholder isn't present — that means the template is malformed
 * and the worker should not attempt to grade against it.
 */
export function assembleSource(driverCode: string, userCode: string): string {
  if (!driverCode.includes(PLACEHOLDER)) {
    throw new Error(
      `Driver template is missing the ${PLACEHOLDER} placeholder; cannot inject user code.`,
    );
  }
  return driverCode.split(PLACEHOLDER).join(userCode);
}
