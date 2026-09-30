import { z } from 'zod';
const line = z.string().min(1).max(1000);
const optional = line.nullable();
export const resultSchema = z.object({
  easy_text: z.array(line).max(60), actions: z.array(line).max(40),
  date: optional, time: optional, location: optional,
  items: z.array(line).max(30), money: optional, warning: optional,
  uncertain: z.boolean(), uncertain_text: optional,
}).strict();
export type EasyResult = z.infer<typeof resultSchema>;
export const outputJsonSchema = z.toJSONSchema(resultSchema);
export function validateResult(value: unknown): EasyResult {
  const data = resultSchema.parse(value);
  if (data.uncertain) return {
    easy_text: [], actions: [], date: null, time: null, location: null,
    items: [], money: null, warning: null, uncertain: true,
    uncertain_text: data.uncertain_text || '정확하게 듣지 못했어요. 다시 말해 주세요.',
  };
  if (!data.easy_text.length) throw new Error('Empty result');
  return data;
}
export function spokenResult(result: EasyResult) {
  return result.uncertain ? result.uncertain_text || '' : [...result.easy_text, result.warning ? `주의할 점. ${result.warning}` : ''].filter(Boolean).join(' ');
}
