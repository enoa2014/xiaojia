import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
const defaultLoginForm = { username: '', password: '' };
const defaultRegisterForm = {
    nickname: '',
    password: '',
    name: '',
    phone: '',
    idCard: '',
    applyRole: 'volunteer',
    relative: {
        patientName: '',
        relation: 'father',
        patientIdCard: '',
    },
};
const maskStatus = (profile) => {
    if (!profile)
        return '未注册';
    switch (profile.status) {
        case 'active':
            return '已启用';
        case 'pending':
            return '待审核';
        case 'rejected':
            return '已驳回';
        case 'inactive':
            return '已停用';
        default:
            return '未知状态';
    }
};
const AuthRegisterPage = () => {
    const [tab, setTab] = useState('login');
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError] = useState(null);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [loginForm, setLoginForm] = useState(defaultLoginForm);
    const [loginErrors, setLoginErrors] = useState({});
    const [loginMessage, setLoginMessage] = useState(null);
    const [loginSubmitting, setLoginSubmitting] = useState(false);
    const [registerForm, setRegisterForm] = useState(defaultRegisterForm);
    const [registerErrors, setRegisterErrors] = useState({});
    const [registerMessage, setRegisterMessage] = useState(null);
    const [registerSubmitting, setRegisterSubmitting] = useState(false);
    useEffect(() => {
        const loadProfile = async () => {
            setLoadingProfile(true);
            setProfileError(null);
            try {
                const res = await window.api.users.getProfile();
                if (res.ok) {
                    setCurrentProfile(res.data ?? null);
                }
                else {
                    setProfileError(res.error.msg);
                }
            }
            catch (error) {
                console.error('Failed to load user profile', error);
                setProfileError('读取本地账号信息失败');
            }
            finally {
                setLoadingProfile(false);
            }
        };
        loadProfile();
    }, []);
    const handleSwitchTab = (next) => {
        setTab(next);
        setLoginMessage(null);
        setRegisterMessage(null);
    };
    const validateLogin = (form) => {
        const errors = {};
        if (!form.username.trim()) {
            errors.username = '请输入用户名';
        }
        if (!form.password.trim()) {
            errors.password = '请输入密码';
        }
        else if (form.password.length < 6) {
            errors.password = '密码至少 6 位';
        }
        return errors;
    };
    const validateRegister = (form) => {
        const errors = {};
        if (form.nickname && (form.nickname.length < 1 || form.nickname.length > 30)) {
            errors.nickname = '昵称长度需 1-30 字';
        }
        if (!form.password) {
            errors.password = '请输入密码';
        }
        else if (form.password.length < 6 || form.password.length > 100) {
            errors.password = '密码长度需 6-100 位';
        }
        if (!form.name.trim()) {
            errors.name = '请输入姓名';
        }
        else if (form.name.length < 2 || form.name.length > 30) {
            errors.name = '姓名长度需 2-30 字';
        }
        if (!/^1\d{10}$/.test(form.phone.trim())) {
            errors.phone = '请输入 11 位手机号';
        }
        const idCard = form.idCard.trim().toUpperCase();
        if (!idCard) {
            errors.idCard = '请输入身份证号';
        }
        else if (!/^[0-9]{17}[0-9X]$/.test(idCard)) {
            errors.idCard = '身份证号格式不正确';
        }
        if (form.applyRole !== 'volunteer' && form.applyRole !== 'parent') {
            errors.applyRole = '请选择申请角色';
        }
        if (form.applyRole === 'parent') {
            if (!form.relative.patientName.trim()) {
                errors.relativePatientName = '请填写患者姓名';
            }
            const patientIdCard = form.relative.patientIdCard.trim().toUpperCase();
            if (!patientIdCard) {
                errors.relativePatientIdCard = '请填写患者身份证号';
            }
            else if (!/^[0-9]{17}[0-9X]$/.test(patientIdCard)) {
                errors.relativePatientIdCard = '患者身份证号格式不正确';
            }
            if (!form.relative.relation) {
                errors.relativeRelation = '请选择亲属关系';
            }
        }
        return errors;
    };
    const handleLoginSubmit = async (event) => {
        event.preventDefault();
        const errors = validateLogin(loginForm);
        setLoginErrors(errors);
        if (Object.keys(errors).length) {
            setLoginMessage({ type: 'error', text: '请检查表单信息' });
            return;
        }
        const payload = {
            username: loginForm.username.trim(),
            password: loginForm.password,
        };
        setLoginSubmitting(true);
        setLoginMessage(null);
        try {
            const res = await window.api.users.login(payload);
            if (!res.ok) {
                setLoginMessage({ type: 'error', text: res.error.msg });
                return;
            }
            const user = res.data.user;
            setCurrentProfile(user);
            switch (user.status) {
                case 'active':
                    setLoginMessage({ type: 'success', text: '登录成功，可以访问业务功能。' });
                    break;
                case 'pending':
                    setLoginMessage({ type: 'info', text: '资料已提交，正在等待审核。' });
                    break;
                case 'rejected':
                    setLoginMessage({
                        type: 'error',
                        text: user.rejectReason ? `资料被驳回：${user.rejectReason}` : '资料被驳回，请联系管理员。',
                    });
                    break;
                default:
                    setLoginMessage({ type: 'info', text: '账号状态异常，请联系管理员。' });
                    break;
            }
        }
        catch (error) {
            console.error('Login failed', error);
            setLoginMessage({ type: 'error', text: '登录失败，请稍后再试。' });
        }
        finally {
            setLoginSubmitting(false);
        }
    };
    const handleRegisterSubmit = async (event) => {
        event.preventDefault();
        const errors = validateRegister(registerForm);
        setRegisterErrors(errors);
        if (Object.keys(errors).length) {
            setRegisterMessage({ type: 'error', text: '请修正表单中的错误后再提交。' });
            return;
        }
        const payload = {
            password: registerForm.password,
            name: registerForm.name.trim(),
            phone: registerForm.phone.trim(),
            idCard: registerForm.idCard.trim().toUpperCase(),
            applyRole: registerForm.applyRole,
        };
        if (registerForm.nickname.trim()) {
            payload.nickname = registerForm.nickname.trim();
        }
        if (registerForm.applyRole === 'parent') {
            payload.relative = {
                patientName: registerForm.relative.patientName.trim(),
                relation: registerForm.relative.relation,
                patientIdCard: registerForm.relative.patientIdCard.trim().toUpperCase(),
            };
        }
        setRegisterSubmitting(true);
        setRegisterMessage(null);
        try {
            const res = await window.api.users.register(payload);
            if (!res.ok) {
                setRegisterMessage({ type: 'error', text: res.error.msg });
                return;
            }
            setRegisterMessage({ type: 'success', text: '提交成功，审核通过后即可使用全部功能。' });
            const profileRes = await window.api.users.getProfile();
            if (profileRes.ok) {
                setCurrentProfile(profileRes.data ?? null);
            }
            setRegisterForm({
                ...defaultRegisterForm,
                applyRole: registerForm.applyRole,
            });
        }
        catch (error) {
            console.error('Register failed', error);
            setRegisterMessage({ type: 'error', text: '提交失败，请稍后重试。' });
        }
        finally {
            setRegisterSubmitting(false);
        }
    };
    const handleLogout = async () => {
        try {
            const res = await window.api.users.logout();
            if (res.ok) {
                setCurrentProfile(null);
                setLoginMessage({ type: 'info', text: '已退出登录。' });
            }
            else {
                setLoginMessage({ type: 'error', text: res.error.msg });
            }
        }
        catch (error) {
            console.error('Logout failed', error);
            setLoginMessage({ type: 'error', text: '退出失败，请稍后再试。' });
        }
    };
    const relativeVisible = registerForm.applyRole === 'parent';
    const statusLabel = useMemo(() => maskStatus(currentProfile), [currentProfile]);
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "page__header", children: [_jsx("h1", { children: "\u8D26\u53F7\u4E0E\u6CE8\u518C" }), _jsx("p", { children: "\u5728\u684C\u9762\u7AEF\u5B8C\u6210\u8D26\u53F7\u6CE8\u518C\u6216\u5BC6\u7801\u767B\u5F55\u3002\u63D0\u4EA4\u6210\u529F\u540E\u9700\u8981\u7BA1\u7406\u5458\u5BA1\u6838\u624D\u80FD\u6FC0\u6D3B\u6743\u9650\u3002" })] }), _jsx("section", { className: "card", children: _jsx("div", { className: "account-status", children: loadingProfile ? (_jsx("p", { children: "\u6B63\u5728\u8BFB\u53D6\u8D26\u53F7\u4FE1\u606F\u2026" })) : profileError ? (_jsx("p", { className: "form__error", children: profileError })) : currentProfile ? (_jsxs("div", { className: "account-status__body", children: [_jsxs("div", { children: [_jsx("div", { className: "account-status__badge", children: statusLabel }), _jsxs("div", { className: "account-status__meta", children: [_jsxs("span", { children: ["\u59D3\u540D\uFF1A", currentProfile.name ?? '—'] }), _jsxs("span", { children: ["\u624B\u673A\u53F7\uFF1A", currentProfile.phoneMasked ?? '—'] }), _jsxs("span", { children: ["\u7533\u8BF7\u89D2\u8272\uFF1A", currentProfile.applyRole === 'parent' ? '家属' : '志愿者'] }), currentProfile.relative ? (_jsxs("span", { children: ["\u5173\u8054\u60A3\u8005\uFF1A", currentProfile.relative.patientName ?? '—', currentProfile.relative.relation ? `（${currentProfile.relative.relation}）` : '', currentProfile.relative.patientIdCardMasked ? `，${currentProfile.relative.patientIdCardMasked}` : ''] })) : null] }), currentProfile.status === 'rejected' && currentProfile.rejectReason ? (_jsxs("p", { className: "account-status__hint", children: ["\u9A73\u56DE\u539F\u56E0\uFF1A", currentProfile.rejectReason] })) : null] }), _jsx("div", { children: _jsx("button", { type: "button", className: "button button--ghost", onClick: handleLogout, children: "\u9000\u51FA\u767B\u5F55" }) })] })) : (_jsx("p", { children: "\u5F53\u524D\u8BBE\u5907\u5C1A\u672A\u63D0\u4EA4\u6CE8\u518C\u8D44\u6599\uFF0C\u8BF7\u5728\u4E0B\u65B9\u586B\u5199\u5E76\u63D0\u4EA4\u3002" })) }) }), _jsxs("section", { className: "card auth-card", children: [_jsxs("div", { className: "auth-tabs", children: [_jsx("button", { type: "button", className: tab === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab', onClick: () => handleSwitchTab('login'), disabled: loginSubmitting || registerSubmitting, children: "\u8D26\u53F7\u767B\u5F55" }), _jsx("button", { type: "button", className: tab === 'register' ? 'auth-tab auth-tab--active' : 'auth-tab', onClick: () => handleSwitchTab('register'), disabled: loginSubmitting || registerSubmitting, children: "\u6CE8\u518C\u65B0\u8D26\u53F7" })] }), tab === 'login' ? (_jsxs("form", { className: "form", onSubmit: handleLoginSubmit, children: [_jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u7528\u6237\u540D" }), _jsx("input", { type: "text", value: loginForm.username, onChange: (event) => setLoginForm((prev) => ({ ...prev, username: event.target.value })), placeholder: "\u8BF7\u8F93\u5165\u6CE8\u518C\u65F6\u8BBE\u7F6E\u7684\u7528\u6237\u540D", disabled: loginSubmitting }), loginErrors.username ? _jsx("div", { className: "form__error", children: loginErrors.username }) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u5BC6\u7801" }), _jsx("input", { type: "password", value: loginForm.password, onChange: (event) => setLoginForm((prev) => ({ ...prev, password: event.target.value })), placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801", disabled: loginSubmitting }), loginErrors.password ? _jsx("div", { className: "form__error", children: loginErrors.password }) : null] }), loginMessage ? _jsx("div", { className: `auth-message auth-message--${loginMessage.type}`, children: loginMessage.text }) : null, _jsx("div", { className: "form__actions", children: _jsx("button", { type: "submit", disabled: loginSubmitting, children: loginSubmitting ? '登录中…' : '登录' }) })] })) : (_jsxs("form", { className: "form", onSubmit: handleRegisterSubmit, children: [_jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u6635\u79F0\uFF08\u53EF\u9009\uFF09" }), _jsx("input", { type: "text", value: registerForm.nickname, onChange: (event) => setRegisterForm((prev) => ({ ...prev, nickname: event.target.value })), placeholder: "\u7528\u4E8E\u5C55\u793A\u7684\u6635\u79F0", disabled: registerSubmitting }), registerErrors.nickname ? _jsx("div", { className: "form__error", children: registerErrors.nickname }) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u767B\u5F55\u5BC6\u7801" }), _jsx("input", { type: "password", value: registerForm.password, onChange: (event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value })), placeholder: "\u8BBE\u7F6E\u767B\u5F55\u5BC6\u7801\uFF0C\u81F3\u5C11 6 \u4F4D", disabled: registerSubmitting }), registerErrors.password ? _jsx("div", { className: "form__error", children: registerErrors.password }) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u59D3\u540D" }), _jsx("input", { type: "text", value: registerForm.name, onChange: (event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value })), placeholder: "\u8BF7\u8F93\u5165\u771F\u5B9E\u59D3\u540D", disabled: registerSubmitting }), registerErrors.name ? _jsx("div", { className: "form__error", children: registerErrors.name }) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u624B\u673A\u53F7" }), _jsx("input", { type: "text", value: registerForm.phone, onChange: (event) => setRegisterForm((prev) => ({ ...prev, phone: event.target.value })), placeholder: "\u8BF7\u8F93\u5165 11 \u4F4D\u624B\u673A\u53F7", maxLength: 11, disabled: registerSubmitting }), registerErrors.phone ? _jsx("div", { className: "form__error", children: registerErrors.phone }) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u8EAB\u4EFD\u8BC1\u53F7" }), _jsx("input", { type: "text", value: registerForm.idCard, onChange: (event) => setRegisterForm((prev) => ({ ...prev, idCard: event.target.value })), placeholder: "\u8BF7\u8F93\u5165 18 \u4F4D\u8EAB\u4EFD\u8BC1\u53F7", maxLength: 18, disabled: registerSubmitting }), registerErrors.idCard ? _jsx("div", { className: "form__error", children: registerErrors.idCard }) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u7533\u8BF7\u89D2\u8272" }), _jsxs("select", { value: registerForm.applyRole, onChange: (event) => {
                                            const value = event.target.value === 'parent' ? 'parent' : 'volunteer';
                                            setRegisterForm((prev) => ({
                                                ...prev,
                                                applyRole: value,
                                                relative: value === 'parent'
                                                    ? prev.relative
                                                    : { patientName: '', relation: 'father', patientIdCard: '' },
                                            }));
                                        }, disabled: registerSubmitting, children: [_jsx("option", { value: "volunteer", children: "\u5FD7\u613F\u8005" }), _jsx("option", { value: "parent", children: "\u5BB6\u5C5E" })] }), registerErrors.applyRole ? _jsx("div", { className: "form__error", children: registerErrors.applyRole }) : null] }), relativeVisible ? (_jsxs("div", { className: "form__fieldset", children: [_jsx("div", { className: "form__fieldset-header", children: "\u4EB2\u5C5E\u4FE1\u606F" }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u60A3\u8005\u59D3\u540D" }), _jsx("input", { type: "text", value: registerForm.relative.patientName, onChange: (event) => setRegisterForm((prev) => ({
                                                    ...prev,
                                                    relative: {
                                                        ...prev.relative,
                                                        patientName: event.target.value,
                                                    },
                                                })), placeholder: "\u8BF7\u8F93\u5165\u5173\u8054\u60A3\u8005\u59D3\u540D", disabled: registerSubmitting }), registerErrors.relativePatientName ? (_jsx("div", { className: "form__error", children: registerErrors.relativePatientName })) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u4EB2\u5C5E\u5173\u7CFB" }), _jsxs("select", { value: registerForm.relative.relation, onChange: (event) => setRegisterForm((prev) => ({
                                                    ...prev,
                                                    relative: {
                                                        ...prev.relative,
                                                        relation: event.target.value || 'father',
                                                    },
                                                })), disabled: registerSubmitting, children: [_jsx("option", { value: "father", children: "\u7236\u4EB2" }), _jsx("option", { value: "mother", children: "\u6BCD\u4EB2" }), _jsx("option", { value: "guardian", children: "\u76D1\u62A4\u4EBA" }), _jsx("option", { value: "other", children: "\u5176\u4ED6" })] }), registerErrors.relativeRelation ? _jsx("div", { className: "form__error", children: registerErrors.relativeRelation }) : null] }), _jsxs("label", { className: "form__field", children: [_jsx("span", { children: "\u60A3\u8005\u8EAB\u4EFD\u8BC1\u53F7" }), _jsx("input", { type: "text", value: registerForm.relative.patientIdCard, onChange: (event) => setRegisterForm((prev) => ({
                                                    ...prev,
                                                    relative: {
                                                        ...prev.relative,
                                                        patientIdCard: event.target.value,
                                                    },
                                                })), placeholder: "\u8BF7\u8F93\u5165 18 \u4F4D\u8EAB\u4EFD\u8BC1\u53F7", maxLength: 18, disabled: registerSubmitting }), registerErrors.relativePatientIdCard ? (_jsx("div", { className: "form__error", children: registerErrors.relativePatientIdCard })) : null] })] })) : null, registerMessage ? (_jsx("div", { className: `auth-message auth-message--${registerMessage.type}`, children: registerMessage.text })) : null, _jsx("div", { className: "form__actions", children: _jsx("button", { type: "submit", disabled: registerSubmitting, children: registerSubmitting ? '提交中…' : '提交注册' }) })] }))] })] }));
};
export default AuthRegisterPage;
