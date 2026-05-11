import { JudgeRunRequest, JudgeRunResult } from './types';

/**
 * Vendor-neutral judge contract. Implementations: RapidApiJudge0Client, future SelfHostedJudge0Client, etc.
 */
export interface JudgeClient {
  /**
   * Compile and execute the source against the given stdin within the provided limits.
   * Returns a normalized result regardless of the underlying judge implementation.
   * Should NOT throw on user-code failures (compile/runtime/TLE) — return a result with status set.
   * MAY throw on infrastructure failures (network down, auth, malformed response).
   */
  run(request: JudgeRunRequest): Promise<JudgeRunResult>;
}
