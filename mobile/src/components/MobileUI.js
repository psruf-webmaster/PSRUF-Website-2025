import { Link } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from './AppScreen';

export function ScreenHero({ eyebrow, title, description, children }) {
  return (
    <Card className="gap-4 bg-[#f3e2d6]">
      {eyebrow ? <Text className="text-xs font-semibold uppercase tracking-[3px] text-accent">{eyebrow}</Text> : null}
      <Text className="text-4xl font-semibold leading-tight text-ink">{title}</Text>
      {description ? <Text className="text-base leading-7 text-muted">{description}</Text> : null}
      {children}
    </Card>
  );
}

export function SectionTitle({ title, detail }) {
  return (
    <View className="gap-1">
      <Text className="text-2xl font-semibold text-ink">{title}</Text>
      {detail ? <Text className="text-base leading-6 text-muted">{detail}</Text> : null}
    </View>
  );
}

export function StatRow({ items }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => (
        <View key={item.label} className="min-w-[140px] flex-1 rounded-[24px] border border-line bg-card p-4">
          <Text className="text-xs font-semibold uppercase tracking-[2px] text-accent">{item.label}</Text>
          <Text className="mt-2 text-2xl font-semibold text-ink">{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function InfoBlock({ title, detail, children }) {
  return (
    <Card className="gap-2">
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      {detail ? <Text className="text-base leading-6 text-muted">{detail}</Text> : null}
      {children}
    </Card>
  );
}

export function BulletList({ items }) {
  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item} className="flex-row gap-3">
          <Text className="mt-0.5 text-base text-accent">•</Text>
          <Text className="flex-1 text-base leading-6 text-muted">{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function LinkCard({ href, title, detail }) {
  return (
    <Link href={href} asChild>
      <Pressable>
        <Card className="gap-2">
          <Text className="text-lg font-semibold text-ink">{title}</Text>
          <Text className="text-base leading-6 text-muted">{detail}</Text>
          <Text className="text-sm font-semibold uppercase tracking-[2px] text-accent">Open page</Text>
        </Card>
      </Pressable>
    </Link>
  );
}

export function ActionRow({ primaryLabel, onPrimaryPress, secondaryLabel, onSecondaryPress }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {primaryLabel ? (
        <Pressable onPress={onPrimaryPress} className="rounded-full bg-accent px-5 py-3">
          <Text className="text-sm font-semibold text-white">{primaryLabel}</Text>
        </Pressable>
      ) : null}
      {secondaryLabel ? (
        <Pressable onPress={onSecondaryPress} className="rounded-full border border-line bg-card px-5 py-3">
          <Text className="text-sm font-semibold text-ink">{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Notice({ tone = 'default', text }) {
  const toneClass = tone === 'warning' ? 'bg-[#fff0e3] text-warning' : 'bg-card text-muted';
  return (
    <View className={`rounded-[24px] border border-line px-4 py-3 ${toneClass}`}>
      <Text className="text-sm leading-6">{text}</Text>
    </View>
  );
}

export function ListItem({ title, detail, rightText }) {
  return (
    <View className="rounded-[24px] border border-line bg-white px-4 py-4">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1 gap-1">
          <Text className="text-base font-semibold text-ink">{title}</Text>
          {detail ? <Text className="text-sm leading-5 text-muted">{detail}</Text> : null}
        </View>
        {rightText ? <Text className="text-xs font-semibold uppercase tracking-[2px] text-accent">{rightText}</Text> : null}
      </View>
    </View>
  );
}

export function ChoiceChips({ options, selectedValues, onToggle, multi = true }) {
  const selected = Array.isArray(selectedValues) ? selectedValues : [selectedValues].filter(Boolean);

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const value = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        const isSelected = selected.includes(value);

        return (
          <Pressable
            key={value}
            onPress={() => onToggle(value, { multi })}
            className={`rounded-full px-4 py-3 ${isSelected ? 'bg-accent' : 'border border-line bg-card'}`}
          >
            <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-ink'}`}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LabeledInput({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default', secureTextEntry = false }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8b796d"
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-3xl border border-line bg-white px-4 py-4 text-base text-ink ${multiline ? 'min-h-[120px]' : ''}`}
      />
    </View>
  );
}

export function ToggleTile({ label, detail, selected, onPress }) {
  return (
    <Pressable onPress={onPress} className={`rounded-[24px] border px-4 py-4 ${selected ? 'border-accent bg-[#f3e2d6]' : 'border-line bg-white'}`}>
      <Text className="text-base font-semibold text-ink">{label}</Text>
      {detail ? <Text className="mt-1 text-sm leading-5 text-muted">{detail}</Text> : null}
    </Pressable>
  );
}

export function AttachmentPill({ label, onRemove }) {
  return (
    <View className="flex-row items-center gap-2 rounded-full border border-line bg-card px-4 py-3">
      <Text className="max-w-[220px] text-sm font-semibold text-ink" numberOfLines={1}>{label}</Text>
      {onRemove ? (
        <Pressable onPress={onRemove} className="rounded-full bg-[#ead7c8] px-2 py-1">
          <Text className="text-xs font-semibold text-ink">Remove</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
