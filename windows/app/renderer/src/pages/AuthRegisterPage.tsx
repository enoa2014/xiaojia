import { useEffect, useMemo, useState } from 'react';
import type { UserLoginInput, UserRegisterInput } from '@shared/schemas/users';
import type { UserProfile } from '@shared/types/users';

type TabKey = 'login' | 'register';

type LoginForm = {
  username: string;
  password: string;
};

type LoginErrors = Partial<Record<keyof LoginForm, string>>;

type RegisterFormState = {
  nickname: string;
  password: string;
  name: string;
  phone: string;
  idCard: string;
  applyRole: 'volunteer' | 'parent';
  relative: {
    patientName: string;
    relation: 'father' | 'mother' | 'guardian' | 'other';
    patientIdCard: string;
  };
};

type RegisterErrors = {
  nickname?: string;
  password?: string;
  name?: string;
  phone?: string;
  idCard?: string;
  applyRole?: string;
  relativePatientName?: string;
  relativePatientIdCard?: string;
  relativeRelation?: string;
};

type MessagePayload = {
  type: 'success' | 'error' | 'info';
  text: string;
};

const defaultLoginForm: LoginForm = { username: '', password: '' };
const defaultRegisterForm: RegisterFormState = {
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

const maskStatus = (profile: UserProfile | null): string => {
  if (!profile) return '未注册';
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
  const [tab, setTab] = useState<TabKey>('login');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);

  const [loginForm, setLoginForm] = useState<LoginForm>(defaultLoginForm);
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [loginMessage, setLoginMessage] = useState<MessagePayload | null>(null);
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [registerForm, setRegisterForm] = useState<RegisterFormState>(defaultRegisterForm);
  const [registerErrors, setRegisterErrors] = useState<RegisterErrors>({});
  const [registerMessage, setRegisterMessage] = useState<MessagePayload | null>(null);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const res = await window.api.users.getProfile();
        if (res.ok) {
          setCurrentProfile(res.data ?? null);
        } else {
          setProfileError(res.error.msg);
        }
      } catch (error) {
        console.error('Failed to load user profile', error);
        setProfileError('读取本地账号信息失败');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleSwitchTab = (next: TabKey) => {
    setTab(next);
    setLoginMessage(null);
    setRegisterMessage(null);
  };

  const validateLogin = (form: LoginForm): LoginErrors => {
    const errors: LoginErrors = {};
    if (!form.username.trim()) {
      errors.username = '请输入用户名';
    }
    if (!form.password.trim()) {
      errors.password = '请输入密码';
    } else if (form.password.length < 6) {
      errors.password = '密码至少 6 位';
    }
    return errors;
  };

  const validateRegister = (form: RegisterFormState): RegisterErrors => {
    const errors: RegisterErrors = {};
    if (form.nickname && (form.nickname.length < 1 || form.nickname.length > 30)) {
      errors.nickname = '昵称长度需 1-30 字';
    }
    if (!form.password) {
      errors.password = '请输入密码';
    } else if (form.password.length < 6 || form.password.length > 100) {
      errors.password = '密码长度需 6-100 位';
    }
    if (!form.name.trim()) {
      errors.name = '请输入姓名';
    } else if (form.name.length < 2 || form.name.length > 30) {
      errors.name = '姓名长度需 2-30 字';
    }
    if (!/^1\d{10}$/.test(form.phone.trim())) {
      errors.phone = '请输入 11 位手机号';
    }
    const idCard = form.idCard.trim().toUpperCase();
    if (!idCard) {
      errors.idCard = '请输入身份证号';
    } else if (!/^[0-9]{17}[0-9X]$/.test(idCard)) {
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
      } else if (!/^[0-9]{17}[0-9X]$/.test(patientIdCard)) {
        errors.relativePatientIdCard = '患者身份证号格式不正确';
      }
      if (!form.relative.relation) {
        errors.relativeRelation = '请选择亲属关系';
      }
    }
    return errors;
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateLogin(loginForm);
    setLoginErrors(errors);
    if (Object.keys(errors).length) {
      setLoginMessage({ type: 'error', text: '请检查表单信息' });
      return;
    }

    const payload: UserLoginInput = {
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
    } catch (error) {
      console.error('Login failed', error);
      setLoginMessage({ type: 'error', text: '登录失败，请稍后再试。' });
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateRegister(registerForm);
    setRegisterErrors(errors);
    if (Object.keys(errors).length) {
      setRegisterMessage({ type: 'error', text: '请修正表单中的错误后再提交。' });
      return;
    }

    const payload: UserRegisterInput = {
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
    } catch (error) {
      console.error('Register failed', error);
      setRegisterMessage({ type: 'error', text: '提交失败，请稍后重试。' });
    } finally {
      setRegisterSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await window.api.users.logout();
      if (res.ok) {
        setCurrentProfile(null);
        setLoginMessage({ type: 'info', text: '已退出登录。' });
      } else {
        setLoginMessage({ type: 'error', text: res.error.msg });
      }
    } catch (error) {
      console.error('Logout failed', error);
      setLoginMessage({ type: 'error', text: '退出失败，请稍后再试。' });
    }
  };

  const relativeVisible = registerForm.applyRole === 'parent';

  const statusLabel = useMemo(() => maskStatus(currentProfile), [currentProfile]);

  return (
    <div className="page">
      <header className="page__header">
        <h1>账号与注册</h1>
        <p>在桌面端完成账号注册或密码登录。提交成功后需要管理员审核才能激活权限。</p>
      </header>

      <section className="card">
        <div className="account-status">
          {loadingProfile ? (
            <p>正在读取账号信息…</p>
          ) : profileError ? (
            <p className="form__error">{profileError}</p>
          ) : currentProfile ? (
            <div className="account-status__body">
              <div>
                <div className="account-status__badge">{statusLabel}</div>
                <div className="account-status__meta">
                  <span>姓名：{currentProfile.name ?? '—'}</span>
                  <span>手机号：{currentProfile.phoneMasked ?? '—'}</span>
                  <span>申请角色：{currentProfile.applyRole === 'parent' ? '家属' : '志愿者'}</span>
                  {currentProfile.relative ? (
                    <span>
                      关联患者：{currentProfile.relative.patientName ?? '—'}
                      {currentProfile.relative.relation ? `（${currentProfile.relative.relation}）` : ''}
                      {currentProfile.relative.patientIdCardMasked ? `，${currentProfile.relative.patientIdCardMasked}` : ''}
                    </span>
                  ) : null}
                </div>
                {currentProfile.status === 'rejected' && currentProfile.rejectReason ? (
                  <p className="account-status__hint">驳回原因：{currentProfile.rejectReason}</p>
                ) : null}
              </div>
              <div>
                <button type="button" className="button button--ghost" onClick={handleLogout}>
                  退出登录
                </button>
              </div>
            </div>
          ) : (
            <p>当前设备尚未提交注册资料，请在下方填写并提交。</p>
          )}
        </div>
      </section>

      <section className="card auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'}
            onClick={() => handleSwitchTab('login')}
            disabled={loginSubmitting || registerSubmitting}
          >
            账号登录
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'auth-tab auth-tab--active' : 'auth-tab'}
            onClick={() => handleSwitchTab('register')}
            disabled={loginSubmitting || registerSubmitting}
          >
            注册新账号
          </button>
        </div>

        {tab === 'login' ? (
          <form className="form" onSubmit={handleLoginSubmit}>
            <label className="form__field">
              <span>用户名</span>
              <input
                type="text"
                value={loginForm.username}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="请输入注册时设置的用户名"
                disabled={loginSubmitting}
              />
              {loginErrors.username ? <div className="form__error">{loginErrors.username}</div> : null}
            </label>
            <label className="form__field">
              <span>密码</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="请输入密码"
                disabled={loginSubmitting}
              />
              {loginErrors.password ? <div className="form__error">{loginErrors.password}</div> : null}
            </label>
            {loginMessage ? <div className={`auth-message auth-message--${loginMessage.type}`}>{loginMessage.text}</div> : null}
            <div className="form__actions">
              <button type="submit" disabled={loginSubmitting}>
                {loginSubmitting ? '登录中…' : '登录'}
              </button>
            </div>
          </form>
        ) : (
          <form className="form" onSubmit={handleRegisterSubmit}>
            <label className="form__field">
              <span>昵称（可选）</span>
              <input
                type="text"
                value={registerForm.nickname}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, nickname: event.target.value }))}
                placeholder="用于展示的昵称"
                disabled={registerSubmitting}
              />
              {registerErrors.nickname ? <div className="form__error">{registerErrors.nickname}</div> : null}
            </label>
            <label className="form__field">
              <span>登录密码</span>
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="设置登录密码，至少 6 位"
                disabled={registerSubmitting}
              />
              {registerErrors.password ? <div className="form__error">{registerErrors.password}</div> : null}
            </label>
            <label className="form__field">
              <span>姓名</span>
              <input
                type="text"
                value={registerForm.name}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="请输入真实姓名"
                disabled={registerSubmitting}
              />
              {registerErrors.name ? <div className="form__error">{registerErrors.name}</div> : null}
            </label>
            <label className="form__field">
              <span>手机号</span>
              <input
                type="text"
                value={registerForm.phone}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="请输入 11 位手机号"
                maxLength={11}
                disabled={registerSubmitting}
              />
              {registerErrors.phone ? <div className="form__error">{registerErrors.phone}</div> : null}
            </label>
            <label className="form__field">
              <span>身份证号</span>
              <input
                type="text"
                value={registerForm.idCard}
                onChange={(event) => setRegisterForm((prev) => ({ ...prev, idCard: event.target.value }))}
                placeholder="请输入 18 位身份证号"
                maxLength={18}
                disabled={registerSubmitting}
              />
              {registerErrors.idCard ? <div className="form__error">{registerErrors.idCard}</div> : null}
            </label>

            <label className="form__field">
              <span>申请角色</span>
              <select
                value={registerForm.applyRole}
                onChange={(event) => {
                  const value = event.target.value === 'parent' ? 'parent' : 'volunteer';
                  setRegisterForm((prev) => ({
                    ...prev,
                    applyRole: value,
                    relative:
                      value === 'parent'
                        ? prev.relative
                        : { patientName: '', relation: 'father', patientIdCard: '' },
                  }));
                }}
                disabled={registerSubmitting}
              >
                <option value="volunteer">志愿者</option>
                <option value="parent">家属</option>
              </select>
              {registerErrors.applyRole ? <div className="form__error">{registerErrors.applyRole}</div> : null}
            </label>

            {relativeVisible ? (
              <div className="form__fieldset">
                <div className="form__fieldset-header">亲属信息</div>
                <label className="form__field">
                  <span>患者姓名</span>
                  <input
                    type="text"
                    value={registerForm.relative.patientName}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        relative: {
                          ...prev.relative,
                          patientName: event.target.value,
                        },
                      }))
                    }
                    placeholder="请输入关联患者姓名"
                    disabled={registerSubmitting}
                  />
                  {registerErrors.relativePatientName ? (
                    <div className="form__error">{registerErrors.relativePatientName}</div>
                  ) : null}
                </label>
                <label className="form__field">
                  <span>亲属关系</span>
                  <select
                    value={registerForm.relative.relation}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        relative: {
                          ...prev.relative,
                          relation: (event.target.value as RegisterFormState['relative']['relation']) || 'father',
                        },
                      }))
                    }
                    disabled={registerSubmitting}
                  >
                    <option value="father">父亲</option>
                    <option value="mother">母亲</option>
                    <option value="guardian">监护人</option>
                    <option value="other">其他</option>
                  </select>
                  {registerErrors.relativeRelation ? <div className="form__error">{registerErrors.relativeRelation}</div> : null}
                </label>
                <label className="form__field">
                  <span>患者身份证号</span>
                  <input
                    type="text"
                    value={registerForm.relative.patientIdCard}
                    onChange={(event) =>
                      setRegisterForm((prev) => ({
                        ...prev,
                        relative: {
                          ...prev.relative,
                          patientIdCard: event.target.value,
                        },
                      }))
                    }
                    placeholder="请输入 18 位身份证号"
                    maxLength={18}
                    disabled={registerSubmitting}
                  />
                  {registerErrors.relativePatientIdCard ? (
                    <div className="form__error">{registerErrors.relativePatientIdCard}</div>
                  ) : null}
                </label>
              </div>
            ) : null}

            {registerMessage ? (
              <div className={`auth-message auth-message--${registerMessage.type}`}>{registerMessage.text}</div>
            ) : null}

            <div className="form__actions">
              <button type="submit" disabled={registerSubmitting}>
                {registerSubmitting ? '提交中…' : '提交注册'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default AuthRegisterPage;
