import { Link } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { AppScreen, Card } from '../../src/components/AppScreen';
import { api } from '../../src/lib/api';
import { signupMajors, signupYears } from '../../src/lib/content';

const providers = ['AT&T', 'Verizon', 'T-Mobile', 'Mint Mobile', 'Other'];

const initialForm = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  phoneServiceProvider: '',
  personalEmail: '',
  personalPassword: '',
  ufEmail: '',
  birthday: '',
  major: '',
  year: '',
};

function Field({ label, value, onChangeText, placeholder, secureTextEntry = false, autoCapitalize = 'sentences' }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8b796d"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        className="rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink"
      />
    </View>
  );
}

export default function SignupScreen() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!form.ufEmail.endsWith('@ufl.edu')) {
      setError('UF email must end with @ufl.edu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/signup', form);
      Alert.alert('Signup submitted', response.data?.message || 'Your account is now pending approval.');
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppScreen scroll>
      <Card className="gap-5">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">Create account</Text>
          <Text className="mt-3 text-3xl font-semibold text-ink">Join with the same member intake form used on the website.</Text>
          <Text className="mt-3 text-base leading-6 text-muted">This screen posts directly to `/api/auth/signup` and keeps the same required fields as the web version.</Text>
        </View>

        <Field label="First name" value={form.firstName} onChangeText={(value) => updateField('firstName', value)} placeholder="Jane" autoCapitalize="words" />
        <Field label="Last name" value={form.lastName} onChangeText={(value) => updateField('lastName', value)} placeholder="Doe" autoCapitalize="words" />
        <Field label="Phone number" value={form.phoneNumber} onChangeText={(value) => updateField('phoneNumber', value)} placeholder="10-digit phone number" autoCapitalize="none" />

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">Phone provider</Text>
          <View className="flex-row flex-wrap gap-2">
            {providers.map((provider) => {
              const selected = form.phoneServiceProvider === provider;
              return (
                <Pressable
                  key={provider}
                  onPress={() => updateField('phoneServiceProvider', provider)}
                  className={`rounded-full px-4 py-3 ${selected ? 'bg-accent' : 'border border-line bg-card'}`}
                >
                  <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{provider}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field label="Personal email" value={form.personalEmail} onChangeText={(value) => updateField('personalEmail', value)} placeholder="example@gmail.com" autoCapitalize="none" />
        <Field label="Password" value={form.personalPassword} onChangeText={(value) => updateField('personalPassword', value)} placeholder="At least 6 characters" secureTextEntry autoCapitalize="none" />
        <Field label="UF email" value={form.ufEmail} onChangeText={(value) => updateField('ufEmail', value)} placeholder="gator@ufl.edu" autoCapitalize="none" />
        <Field label="Birthday" value={form.birthday} onChangeText={(value) => updateField('birthday', value)} placeholder="YYYY-MM-DD" autoCapitalize="none" />
        <Field label="Major" value={form.major} onChangeText={(value) => updateField('major', value)} placeholder="Computer Science" autoCapitalize="words" />
        <Text className="text-sm leading-5 text-muted">Accepted majors: {signupMajors.slice(0, 6).join(', ')} and more.</Text>

        <View className="gap-2">
          <Text className="text-sm font-medium text-ink">Year</Text>
          <View className="flex-row flex-wrap gap-2">
            {signupYears.map((yearOption) => {
              const selected = form.year === yearOption.value;
              return (
                <Pressable
                  key={yearOption.value}
                  onPress={() => updateField('year', yearOption.value)}
                  className={`rounded-full px-4 py-3 ${selected ? 'bg-accent' : 'border border-line bg-card'}`}
                >
                  <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-ink'}`}>{yearOption.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error ? <Text className="text-sm text-warning">{error}</Text> : null}

        <Pressable onPress={submit} disabled={loading} className={`rounded-full px-5 py-4 ${loading ? 'bg-accent/60' : 'bg-accent'}`}>
          <Text className="text-center text-base font-semibold text-white">{loading ? 'Submitting...' : 'Submit application'}</Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable className="rounded-full border border-line px-5 py-4">
            <Text className="text-center text-base font-semibold text-ink">Already have an account? Sign in</Text>
          </Pressable>
        </Link>
      </Card>
    </AppScreen>
  );
}
