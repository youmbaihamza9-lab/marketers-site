import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { hashPassword } from '@/lib/auth';

// نقطة إعداد ذاتية: افتحها مرة واحدة من المتصفح مباشرة على موقعك المنشور
// (وليس محلياً) حتى تكتب كلمتي المرور في نفس مشروع Supabase الذي يستخدمه
// الموقع الحيّ فعلياً - هذا يمنع نهائياً مشكلة "الاتصال بمشروع خاطئ".
//
// الاستخدام: افتح في المتصفح
//   https://موقعك.vercel.app/api/setup?key=القيمة-التي-وضعتها-في-SETUP_SECRET
//
// يمكنك زيارتها أكثر من مرة بأمان لإعادة ضبط كلمتي المرور في أي وقت،
// طالما تعرف قيمة SETUP_SECRET.

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!process.env.SETUP_SECRET) {
    return NextResponse.json(
      { error: 'SETUP_SECRET غير مضبوط في متغيرات البيئة على Vercel. أضفه أولاً.' },
      { status: 500 }
    );
  }

  if (key !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: 'مفتاح غير صحيح' }, { status: 401 });
  }

  const adminPass = process.env.INITIAL_ADMIN_PASSWORD;
  const marketerPass = process.env.INITIAL_MARKETER_PASSWORD;

  if (!adminPass || !marketerPass) {
    return NextResponse.json(
      { error: 'INITIAL_ADMIN_PASSWORD أو INITIAL_MARKETER_PASSWORD غير مضبوطين في متغيرات البيئة' },
      { status: 500 }
    );
  }

  const supabase = supabaseAdmin();
  const adminHash = await hashPassword(adminPass);
  const marketerHash = await hashPassword(marketerPass);

  const { error } = await supabase.from('app_settings').upsert({
    id: 1,
    admin_password_hash: adminHash,
    marketer_password_hash: marketerHash,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return NextResponse.json({ error: 'فشل الكتابة في قاعدة البيانات: ' + error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: 'تم ضبط كلمتي المرور بنجاح في قاعدة البيانات المتصلة فعلاً بهذا الموقع. يمكنك الآن تسجيل الدخول.',
  });
}
