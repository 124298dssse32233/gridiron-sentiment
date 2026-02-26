/**
 * Unit tests for structured-data schema generators
 * Tests validation, type safety, and output correctness
 */

import {
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateTeamSchema,
  generateGameSchema,
  generateArticleSchema,
  generateBreadcrumbs,
  generateFAQSchema,
  generateConferenceSchema,
  generateStadiumSchema,
  generateSeasonSchema,
  generateTeamRatingSnippet,
  jsonLdScript,
  combineSchemas,
  validateSchema,
} from '../structured-data';

describe('Structured Data Generators', () => {
  // ============================================================================
  // WEBSITE SCHEMA TESTS
  // ============================================================================

  describe('generateWebsiteSchema', () => {
    it('should generate valid WebSite schema', () => {
      const schema = generateWebsiteSchema({
        baseUrl: 'https://gridironintel.com',
        searchUrl: 'https://gridironintel.com/search?q={search_term}',
      });

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('Gridiron Intel');
      expect(schema.url).toBe('https://gridironintel.com');
      expect(schema.potentialAction['@type']).toBe('SearchAction');
      expect(schema.potentialAction['query-input']).toBe('required name=search_term');
    });

    it('should pass validation', () => {
      const schema = generateWebsiteSchema({
        baseUrl: 'https://gridironintel.com',
        searchUrl: 'https://gridironintel.com/search?q={search_term}',
      });

      expect(validateSchema(schema as any)).toBe(true);
    });
  });

  // ============================================================================
  // ORGANIZATION SCHEMA TESTS
  // ============================================================================

  describe('generateOrganizationSchema', () => {
    it('should generate Organization schema with contact info', () => {
      const schema = generateOrganizationSchema();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('Gridiron Intel');
      expect(schema.url).toBe('https://gridironintel.com');
      expect(schema.logo).toContain('logo');
      expect(schema.sameAs).toBeInstanceOf(Array);
      expect(schema.contactPoint['@type']).toBe('ContactPoint');
      expect(schema.contactPoint.email).toContain('@');
    });

    it('should include social media links', () => {
      const schema = generateOrganizationSchema();
      const socialLinks = schema.sameAs as string[];

      expect(socialLinks.length).toBeGreaterThan(0);
      expect(socialLinks.some((link) => link.includes('twitter'))).toBe(true);
    });
  });

  // ============================================================================
  // TEAM SCHEMA TESTS
  // ============================================================================

  describe('generateTeamSchema', () => {
    it('should generate valid SportsTeam schema', () => {
      const schema = generateTeamSchema({
        name: 'Ohio State Buckeyes',
        mascot: 'Buckeyes',
        conference: 'Big Ten Conference',
        level: 'FBS',
        stadium: 'Ohio Stadium',
        city: 'Columbus',
        state: 'OH',
        logoUrl: 'https://example.com/ohio-state.png',
        slug: 'ohio-state',
      });

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('SportsTeam');
      expect(schema.name).toBe('Ohio State Buckeyes');
      expect(schema.url).toContain('ohio-state');
      expect(schema.sport).toBe('American Football');
      expect(schema.division).toBe('FBS');
      expect(schema.logo).toBe('https://example.com/ohio-state.png');
    });

    it('should include conference membership', () => {
      const schema = generateTeamSchema({
        name: 'Ohio State Buckeyes',
        conference: 'Big Ten Conference',
        level: 'FBS',
        slug: 'ohio-state',
      });

      expect(schema.memberOf).toBeDefined();
      expect(schema.memberOf?.['@type']).toBe('SportsOrganization');
      expect(schema.memberOf?.name).toBe('Big Ten Conference');
    });

    it('should include stadium location', () => {
      const schema = generateTeamSchema({
        name: 'Ohio State Buckeyes',
        stadium: 'Ohio Stadium',
        city: 'Columbus',
        state: 'OH',
        level: 'FBS',
        slug: 'ohio-state',
      });

      expect(schema.location).toBeDefined();
      expect(schema.location?.name).toBe('Ohio Stadium');
      expect(schema.location?.address?.addressLocality).toBe('Columbus');
      expect(schema.location?.address?.addressRegion).toBe('OH');
    });

    it('should add view action', () => {
      const schema = generateTeamSchema({
        name: 'Ohio State',
        level: 'FBS',
        slug: 'ohio-state',
      });

      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction?.['@type']).toBe('ViewAction');
      expect(schema.potentialAction?.target).toContain('ohio-state');
    });

    it('should handle optional fields', () => {
      const schema = generateTeamSchema({
        name: 'Test Team',
        level: 'D2',
        slug: 'test-team',
      });

      // Should have required fields
      expect(schema['@type']).toBe('SportsTeam');
      expect(schema.name).toBe('Test Team');

      // Optional fields should be undefined if not provided
      expect(schema.logo).toBeUndefined();
      expect(schema.memberOf).toBeUndefined();
    });
  });

  // ============================================================================
  // GAME SCHEMA TESTS
  // ============================================================================

  describe('generateGameSchema', () => {
    it('should generate valid SportsEvent schema', () => {
      const schema = generateGameSchema({
        homeTeam: { name: 'Ohio State', slug: 'ohio-state' },
        awayTeam: { name: 'Michigan', slug: 'michigan' },
        date: '2025-11-29T12:00:00Z',
        venue: 'Michigan Stadium',
        city: 'Ann Arbor',
        state: 'MI',
        week: 13,
        season: 2025,
      });

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('SportsEvent');
      expect(schema.name).toBe('Ohio State vs Michigan');
      expect(schema.startDate).toBeDefined();
      expect(schema.homeTeam?.name).toBe('Ohio State');
      expect(schema.awayTeam?.name).toBe('Michigan');
    });

    it('should include team logos if provided', () => {
      const schema = generateGameSchema({
        homeTeam: { name: 'Ohio State', slug: 'ohio-state', logoUrl: 'https://example.com/osu.png' },
        awayTeam: { name: 'Michigan', slug: 'michigan', logoUrl: 'https://example.com/um.png' },
        date: '2025-11-29T12:00:00Z',
      });

      expect(schema.homeTeam?.logo).toBe('https://example.com/osu.png');
      expect(schema.awayTeam?.logo).toBe('https://example.com/um.png');
    });

    it('should include location information', () => {
      const schema = generateGameSchema({
        homeTeam: { name: 'Ohio State', slug: 'ohio-state' },
        awayTeam: { name: 'Michigan', slug: 'michigan' },
        date: '2025-11-29T12:00:00Z',
        venue: 'Michigan Stadium',
        city: 'Ann Arbor',
        state: 'MI',
      });

      expect(schema.location).toBeDefined();
      expect(schema.location?.name).toBe('Michigan Stadium');
      expect(schema.location?.address?.addressLocality).toBe('Ann Arbor');
      expect(schema.location?.address?.addressRegion).toBe('MI');
    });

    it('should set EventFinished status when game is complete', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const schema = generateGameSchema({
        homeTeam: { name: 'Ohio State', slug: 'ohio-state' },
        awayTeam: { name: 'Michigan', slug: 'michigan' },
        date: pastDate,
        homeScore: 31,
        awayScore: 0,
      });

      expect(schema.eventStatus).toBe('EventFinished');
      expect(schema.result).toBeDefined();
      expect(schema.result?.homeTeamScore).toBe(31);
      expect(schema.result?.awayTeamScore).toBe(0);
    });

    it('should set EventScheduled status for future games', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const schema = generateGameSchema({
        homeTeam: { name: 'Ohio State', slug: 'ohio-state' },
        awayTeam: { name: 'Michigan', slug: 'michigan' },
        date: futureDate,
      });

      expect(schema.eventStatus).toBe('EventScheduled');
    });

    it('should include view action', () => {
      const schema = generateGameSchema({
        homeTeam: { name: 'Ohio State', slug: 'ohio-state' },
        awayTeam: { name: 'Michigan', slug: 'michigan' },
        date: '2025-11-29T12:00:00Z',
        season: 2025,
        week: 13,
      });

      expect(schema.potentialAction).toBeDefined();
      expect(schema.potentialAction?.['@type']).toBe('ViewAction');
      expect(schema.potentialAction?.target).toContain('gameday');
    });
  });

  // ============================================================================
  // ARTICLE SCHEMA TESTS
  // ============================================================================

  describe('generateArticleSchema', () => {
    it('should generate valid Article schema', () => {
      const schema = generateArticleSchema({
        title: 'How GridRank Works',
        description: 'Understanding college football ratings',
        datePublished: '2025-02-24T10:00:00Z',
        slug: 'gridrank-methodology',
        author: 'Gridiron Intel',
      });

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Article');
      expect(schema.headline).toBe('How GridRank Works');
      expect(schema.description).toBe('Understanding college football ratings');
      expect(schema.datePublished).toBe('2025-02-24T10:00:00Z');
      expect(schema.author?.name).toBe('Gridiron Intel');
    });

    it('should use datePublished for dateModified if not provided', () => {
      const schema = generateArticleSchema({
        title: 'Article',
        description: 'Description',
        datePublished: '2025-02-24T10:00:00Z',
        slug: 'article',
      });

      expect(schema.dateModified).toBe(schema.datePublished);
    });

    it('should use provided dateModified', () => {
      const schema = generateArticleSchema({
        title: 'Article',
        description: 'Description',
        datePublished: '2025-02-24T10:00:00Z',
        dateModified: '2025-02-25T14:30:00Z',
        slug: 'article',
      });

      expect(schema.dateModified).toBe('2025-02-25T14:30:00Z');
    });

    it('should include image and publisher', () => {
      const schema = generateArticleSchema({
        title: 'Article',
        description: 'Description',
        datePublished: '2025-02-24T10:00:00Z',
        slug: 'article',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(schema.image).toBe('https://example.com/image.jpg');
      expect(schema.publisher?.name).toBe('Gridiron Intel');
      expect(schema.publisher?.logo).toBeDefined();
    });
  });

  // ============================================================================
  // BREADCRUMB SCHEMA TESTS
  // ============================================================================

  describe('generateBreadcrumbs', () => {
    it('should generate valid BreadcrumbList schema', () => {
      const schema = generateBreadcrumbs([
        { name: 'Home', href: '/' },
        { name: 'Rankings', href: '/rankings' },
        { name: 'Ohio State', href: '/team/ohio-state' },
      ]);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(3);
    });

    it('should number items correctly', () => {
      const schema = generateBreadcrumbs([
        { name: 'Home', href: '/' },
        { name: 'Rankings', href: '/rankings' },
        { name: 'Ohio State', href: '/team/ohio-state' },
      ]);

      schema.itemListElement.forEach((item, index) => {
        expect(item.position).toBe(index + 1);
      });
    });

    it('should construct full URLs', () => {
      const schema = generateBreadcrumbs(
        [
          { name: 'Home', href: '/' },
          { name: 'Rankings', href: '/rankings' },
        ],
        'https://custom.com'
      );

      expect(schema.itemListElement[0].item).toBe('https://custom.com/');
      expect(schema.itemListElement[1].item).toBe('https://custom.com/rankings');
    });
  });

  // ============================================================================
  // FAQ SCHEMA TESTS
  // ============================================================================

  describe('generateFAQSchema', () => {
    it('should generate valid FAQPage schema', () => {
      const schema = generateFAQSchema([
        { question: 'What is GridRank?', answer: 'A rating system' },
        { question: 'How does it work?', answer: 'Using Glicko-2' },
      ]);

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
    });

    it('should structure FAQ items correctly', () => {
      const schema = generateFAQSchema([
        { question: 'Q1?', answer: 'A1' },
      ]);

      const item = schema.mainEntity[0];
      expect(item['@type']).toBe('Question');
      expect(item.name).toBe('Q1?');
      expect(item.acceptedAnswer['@type']).toBe('Answer');
      expect(item.acceptedAnswer.text).toBe('A1');
    });

    it('should handle multiple questions', () => {
      const questions = Array.from({ length: 10 }, (_, i) => ({
        question: `Question ${i}?`,
        answer: `Answer ${i}`,
      }));

      const schema = generateFAQSchema(questions);
      expect(schema.mainEntity).toHaveLength(10);
    });
  });

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  describe('jsonLdScript', () => {
    it('should return JSON string', () => {
      const schema = { '@type': 'Organization', name: 'Test' };
      const result = jsonLdScript(schema);

      expect(typeof result).toBe('string');
      expect(result).toContain('@type');
      expect(result).toContain('Organization');
    });

    it('should be valid JSON', () => {
      const schema = generateTeamSchema({
        name: 'Test Team',
        level: 'FBS',
        slug: 'test',
      });

      const jsonStr = jsonLdScript(schema as any);
      expect(() => JSON.parse(jsonStr)).not.toThrow();
    });
  });

  describe('combineSchemas', () => {
    it('should return single schema if only one provided', () => {
      const schema = generateTeamSchema({
        name: 'Team',
        level: 'FBS',
        slug: 'team',
      });

      const combined = combineSchemas(schema as any);
      expect(combined['@type']).toBe('SportsTeam');
    });

    it('should wrap multiple schemas in @graph', () => {
      const schema1 = generateTeamSchema({
        name: 'Team',
        level: 'FBS',
        slug: 'team',
      });

      const schema2 = generateBreadcrumbs([
        { name: 'Home', href: '/' },
      ]);

      const combined = combineSchemas(schema1 as any, schema2 as any);
      expect(combined['@context']).toBe('https://schema.org');
      expect(combined['@graph']).toHaveLength(2);
    });

    it('should return empty object if no schemas provided', () => {
      const combined = combineSchemas();
      expect(combined).toEqual({});
    });
  });

  describe('validateSchema', () => {
    it('should return true for valid schema', () => {
      const schema = generateTeamSchema({
        name: 'Team',
        level: 'FBS',
        slug: 'team',
      });

      expect(validateSchema(schema as any)).toBe(true);
    });

    it('should return false for missing @context', () => {
      const schema = { '@type': 'SportsTeam', name: 'Team' };
      expect(validateSchema(schema as any)).toBe(false);
    });

    it('should return false for missing @type', () => {
      const schema = { '@context': 'https://schema.org' };
      expect(validateSchema(schema as any)).toBe(false);
    });

    it('should return false for invalid @graph', () => {
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@graph': 'invalid', // should be array
      };
      expect(validateSchema(schema as any)).toBe(false);
    });
  });

  // ============================================================================
  // ADDITIONAL SCHEMA TESTS
  // ============================================================================

  describe('generateTeamRatingSnippet', () => {
    it('should generate rating enrichment object', () => {
      const snippet = generateTeamRatingSnippet('Ohio State', 1523, 1, 11, 1);

      expect(snippet.description).toContain('Ohio State');
      expect(snippet.description).toContain('11-1');
      expect(snippet.aggregateRating).toBeDefined();
    });

    it('should normalize rating to 0-100 scale', () => {
      const snippet = generateTeamRatingSnippet('Team', 1500, 1, 10, 2);
      const aggregateRating = snippet.aggregateRating as any;

      expect(parseFloat(aggregateRating.ratingValue)).toBeLessThanOrEqual(100);
      expect(parseFloat(aggregateRating.ratingValue)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateConferenceSchema', () => {
    it('should generate SportsOrganization schema', () => {
      const schema = generateConferenceSchema(
        'Big Ten Conference',
        'big-ten',
        'FBS',
        18,
        'https://example.com/logo.png'
      );

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('SportsOrganization');
      expect(schema.name).toBe('Big Ten Conference');
      expect((schema as any).member?.numberOfItems).toBe(18);
    });
  });

  describe('generateStadiumSchema', () => {
    it('should generate LocalBusiness schema', () => {
      const schema = generateStadiumSchema(
        'Ohio Stadium',
        'Ohio State Buckeyes',
        'Columbus',
        'OH',
        40.0090,
        -83.1099
      );

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('LocalBusiness');
      expect(schema.name).toBe('Ohio Stadium');
      expect((schema as any).geo?.latitude).toBe(40.0090);
      expect((schema as any).geo?.longitude).toBe(-83.1099);
    });

    it('should handle optional coordinates', () => {
      const schema = generateStadiumSchema(
        'Stadium',
        'Team',
        'City',
        'ST'
      );

      expect((schema as any).geo).toBeUndefined();
    });
  });

  describe('generateSeasonSchema', () => {
    it('should generate EventSeries schema', () => {
      const schema = generateSeasonSchema(
        2025,
        '2025-09-01',
        '2026-01-15',
        15000
      );

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('EventSeries');
      expect(schema.name).toContain('2025');
      expect((schema as any).event?.numberOfItems).toBe(15000);
    });
  });
});

describe('Schema Integration Tests', () => {
  it('should combine team + breadcrumb schemas', () => {
    const team = generateTeamSchema({
      name: 'Ohio State',
      level: 'FBS',
      slug: 'ohio-state',
    });

    const breadcrumbs = generateBreadcrumbs([
      { name: 'Home', href: '/' },
      { name: 'Ohio State', href: '/team/ohio-state' },
    ]);

    const combined = combineSchemas(team as any, breadcrumbs as any);

    expect(combined['@graph']).toHaveLength(2);
    expect(validateSchema(combined as any)).toBe(true);
  });

  it('should combine game + article + organization schemas', () => {
    const game = generateGameSchema({
      homeTeam: { name: 'Ohio State', slug: 'ohio-state' },
      awayTeam: { name: 'Michigan', slug: 'michigan' },
      date: '2025-11-29T12:00:00Z',
    });

    const article = generateArticleSchema({
      title: 'Game Preview',
      description: 'Article about the game',
      datePublished: '2025-11-27T10:00:00Z',
      slug: 'game-preview',
    });

    const org = generateOrganizationSchema();

    const combined = combineSchemas(game as any, article as any, org as any);

    expect(combined['@graph']).toHaveLength(3);
    expect(validateSchema(combined as any)).toBe(true);
  });

  it('should be serializable to JSON', () => {
    const schema = generateTeamSchema({
      name: 'Team',
      level: 'FBS',
      slug: 'team',
    });

    const jsonStr = jsonLdScript(schema as any);
    const parsed = JSON.parse(jsonStr);

    expect(parsed['@type']).toBe('SportsTeam');
  });
});
