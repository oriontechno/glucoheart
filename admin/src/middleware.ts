// Clerk middleware removed. No authentication enforced.

import { NextResponse } from 'next/server';

export function middleware() {
	// No authentication or middleware logic required
	return NextResponse.next();
}

