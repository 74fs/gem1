// ==================== SUPABASE CONFIG ====================
// ⚠️ استبدلي الرابط أدناه بـ Project URL الخاص بك من Supabase Dashboard
const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co'; 

// ✅ المفتاح العام (Publishable Key) - آمن 100% للمتصفح
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2BxHEYQ-RlUwvAMlM8VtUA_Y18z6bO-';

// التحقق من صحة الرابط قبل التهيئة
if (!SUPABASE_URL || SUPABASE_URL.includes('YOUR-PROJECT-ID')) {
    console.error('⚠️ يرجى استبدال SUPABASE_URL برابط مشروعك الحقيقي من Supabase Dashboard');
}

// تهيئة عميل Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ==================== UI HELPERS ====================
function setLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.innerHTML = isLoading 
        ? '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...' 
        : btn.dataset.originalHtml || btn.innerHTML;
    if (!isLoading && !btn.dataset.originalHtml) {
        btn.dataset.originalHtml = btn.innerHTML;
    }
}

function showAlert(message, type = 'error') {
    alert(message);
}

// ==================== NAVBAR ====================
const navbar = document.getElementById('navbar');
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
    if (navbar) {
        navbar.style.padding = window.scrollY > 50 ? '8px 0' : '15px 0';
        navbar.style.boxShadow = window.scrollY > 50 
            ? '0 4px 30px rgba(0,0,0,0.12)' 
            : '0 2px 20px rgba(0,0,0,0.08)';
    }
});

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => navLinks?.classList.toggle('active'));
}

navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks?.classList.remove('active'));
});

// ==================== MODALS ====================
window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

window.switchModal = (closeId, openId) => {
    window.closeModal(closeId);
    setTimeout(() => window.openModal(openId), 200);
};

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) window.closeModal(modal.id);
    });
});

// ==================== AUTH - REGISTER ====================
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const plan = document.getElementById('regPlan').value;

    if (password !== confirmPassword) return showAlert('كلمتا المرور غير متطابقتين!');
    if (password.length < 6) return showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

    setLoading(btn, true);
    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, phone } }
        });

        if (authError) throw authError;

        if (authData?.user) {
            // حفظ الملف الشخصي
            const { error: dbError } = await supabase
                .from('profiles')
                .insert({ id: authData.user.id, full_name: name, email, phone, plan, status: 'active' });
            
            if (dbError) throw dbError;

            // إنشاء فاتورة أولية
            const prices = { basic: 20, premium: 35, vip: 300 };
            const { error: invError } = await supabase
                .from('invoices')
                .insert({
                    user_id: authData.user.id,
                    description: `اشتراك ${plan} - ${plan === 'vip' ? 'سنوي' : 'شهري'}`,
                    amount: prices[plan],
                    status: 'pending'
                });

            if (invError) throw invError;

            showAlert('تم إنشاء حسابك بنجاح! 🎉', 'success');
            window.closeModal('registerModal');
            window.openModal('loginModal');
            e.target.reset();
        }
    } catch (error) {
        showAlert('خطأ في التسجيل: ' + error.message);
    } finally {
        setLoading(btn, false);
    }
});

// ==================== AUTH - LOGIN ====================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
        });

        if (error) throw error;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        window.closeModal('loginModal');
        e.target.reset();

        if (profile?.role === 'admin') {
            window.openModal('adminDashboardModal');
        } else {
            document.getElementById('dashName').textContent = profile?.full_name || 'عضوة';
            document.getElementById('dashPlan').textContent = getPlanName(profile?.plan);
            window.openModal('dashboardModal');
        }
    } catch (error) {
        showAlert('خطأ في تسجيل الدخول: ' + error.message);
    } finally {
        setLoading(btn, false);
    }
});

function getPlanName(plan) {
    const plans = { basic: 'الأساسية', premium: 'المميزة', vip: 'VIP سنوية' };
    return plans[plan] || plan;
}

// ==================== DASHBOARD TABS ====================
window.showTab = (tabId) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById('tab-' + tabId)?.classList.add('active');
};

// ==================== LOGOUT ====================
window.logout = async () => {
    try {
        await supabase.auth.signOut();
        window.closeModal('dashboardModal');
        window.closeModal('adminDashboardModal');
        showAlert('تم تسجيل الخروج بنجاح', 'success');
    } catch (error) {
        showAlert('خطأ أثناء تسجيل الخروج');
    }
};

// ==================== CONTACT FORM ====================
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);

    try {
        const { error } = await supabase.from('contact_messages').insert({
            name: e.target.querySelector('input[type="text"]').value,
            email: e.target.querySelector('input[type="email"]').value,
            phone: e.target.querySelector('input[type="tel"]').value,
            message: e.target.querySelector('textarea').value
        });

        if (error) throw error;
        showAlert('تم إرسال رسالتك بنجاح! سنتواصل معك قريباً 💜', 'success');
        e.target.reset();
    } catch (error) {
        showAlert('حدث خطأ في الإرسال');
    } finally {
        setLoading(btn, false);
    }
});

// ==================== CLASSES FILTER ====================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        document.querySelectorAll('.class-card').forEach(card => {
            if (filter === 'all' || card.dataset.category === filter) {
                card.style.display = 'block';
                card.style.animation = 'fadeIn 0.5s ease';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// ==================== INVOICE & SUBSCRIPTION (Placeholders) ====================
window.downloadInvoice = (id) => {
    alert('جاري تحميل الفاتورة ' + id + ' بصيغة PDF...');
};

window.renewSubscription = () => {
    alert('سيتم تحويلك لبوابة الدفع...');
};

// ==================== SCROLL ANIMATIONS ====================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.about-card, .pricing-card, .class-card, .trainer-card, .testimonial-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// ==================== SESSION CHECK ON LOAD ====================
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        console.log('✅ تم تسجيل الدخول بنجاح');
    } else if (event === 'SIGNED_OUT') {
        console.log('🚪 تم تسجيل الخروج');
    }
});

// تشغيل التحقق عند التحميل
(async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session) console.log('🟢 جلسة نشطة:', data.session.user.email);
})();
