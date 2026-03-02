import { supabaseAdmin } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { email, password } = await req.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password !== process.env.LOGIN_PASSWORD) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Try to create the user in Supabase (auto-confirmed)
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });

    if (createError) {
        // If user already exists, update their password to match
        if (createError.message?.includes('already')) {
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
            const user = listData.users.find((u) => u.email === email);
            if (user) {
                await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
            }
        } else {
            return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true });
}
