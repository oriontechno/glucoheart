import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
export declare class ArticlesService {
    private readonly db;
    constructor(db: NodePgDatabase<typeof import('../db/schema')>);
    private assertWriter;
    private slugify;
    private ensureUniqueSlug;
    create(actingUser: {
        id: number;
        role?: string;
    }, dto: CreateArticleDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        title: string;
        slug: string;
        summary: string | null;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
    }>;
    update(actingUser: {
        id: number;
        role?: string;
    }, id: number, dto: UpdateArticleDto): Promise<{
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        content: string;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    publish(actingUser: {
        id: number;
        role?: string;
    }, id: number): Promise<{
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        content: string;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    unpublish(actingUser: {
        id: number;
        role?: string;
    }, id: number): Promise<{
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        content: string;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getPublicList(query: {
        q?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        coverImage: {
            id: number;
            articleId: number;
            url: string;
            storageKey: string | null;
            alt: string | null;
            isCover: boolean;
            position: number;
            createdAt: Date;
        } | null;
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        content: string;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getPublicBySlug(slug: string): Promise<{
        images: {
            id: number;
            articleId: number;
            url: string;
            storageKey: string | null;
            alt: string | null;
            isCover: boolean;
            position: number;
            createdAt: Date;
        }[];
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        content: string;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getByIdForAdmin(actingUser: {
        id: number;
        role?: string;
    }, id: number): Promise<{
        images: {
            id: number;
            articleId: number;
            url: string;
            storageKey: string | null;
            alt: string | null;
            isCover: boolean;
            position: number;
            createdAt: Date;
        }[];
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        content: string;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listAllForAdmin(actingUser: {
        id: number;
        role?: string;
    }, query: {
        q?: string;
        limit?: number;
        offset?: number;
        status?: 'draft' | 'published';
    }): Promise<{
        id: number;
        title: string;
        slug: string;
        summary: string | null;
        content: string;
        status: "draft" | "published";
        coverImageId: number | null;
        createdBy: number | null;
        updatedBy: number | null;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    attachImage(actingUser: {
        id: number;
        role?: string;
    }, id: number, file: {
        url: string;
        storageKey?: string;
    }, opts: {
        alt?: string;
        isCover?: boolean;
        position?: number;
    }): Promise<{
        id: number;
        createdAt: Date;
        articleId: number;
        url: string;
        storageKey: string | null;
        alt: string | null;
        isCover: boolean;
        position: number;
    }>;
    deleteImage(actingUser: {
        id: number;
        role?: string;
    }, id: number, imageId: number): Promise<{
        ok: boolean;
    }>;
    uploadEditorImage(actingUser: {
        id: number;
        role?: string;
    }, articleId: number, file: {
        url: string;
        storageKey?: string;
    }, opts?: {
        alt?: string;
        position?: number;
    }): Promise<{
        url: string;
        image: {
            id: number;
            createdAt: Date;
            articleId: number;
            url: string;
            storageKey: string | null;
            alt: string | null;
            isCover: boolean;
            position: number;
        };
    }>;
}
