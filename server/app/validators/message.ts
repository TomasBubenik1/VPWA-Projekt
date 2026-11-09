import vine from '@vinejs/vine'

export const messageMaxLength = 4000

export const sendMessageValidator = vine.create({
  content: vine.string().trim().minLength(1).maxLength(messageMaxLength),
})

export const historyValidator = vine.create({
  before: vine.number().withoutDecimals().positive().optional(),
  limit: vine.number().withoutDecimals().range([1, 50]).optional(),
})
