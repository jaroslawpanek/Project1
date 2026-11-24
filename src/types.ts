/** Maximum length of source text accepted for flashcard generation (PRD NFR). */
export const MAX_SOURCE_TEXT_LENGTH = 5000;

/** A single flashcard proposal returned by the generator (not yet saved). */
export interface FlashcardProposalDto {
  front: string;
  back: string;
}

export interface GenerateFlashcardsResponseDto {
  proposals: FlashcardProposalDto[];
}

/** A saved flashcard as shown in the "Moje fiszki" list. */
export interface FlashcardDto extends FlashcardProposalDto {
  id: string;
}

export interface DeleteFlashcardsResponseDto {
  deleted: number;
}

export interface ApiErrorDto {
  error: string;
}
