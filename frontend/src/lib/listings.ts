export type Option = { value: string; label: string }

export const SPORTS: Option[] = [
    { value: 'badminton', label: 'Badminton' },
    { value: 'pickleball', label: 'Pickleball' },
]

export const PLAYER_SKILLS: Option[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
]

export const LISTING_SKILLS: Option[] = [
    ...PLAYER_SKILLS,
    { value: 'all', label: 'All Levels' },
]

export const FORMATS: Option[] = [
    { value: 'casual', label: 'Casual' },
    { value: 'competitive', label: 'Competitive' },
]

export const CAPACITIES = [2, 4]

export function labelFor(options: Option[], value: string) {
    return options.find((option) => option.value === value)?.label ?? value
}