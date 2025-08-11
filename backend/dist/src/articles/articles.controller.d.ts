import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { AttachImageDto } from './dto/attach-image.dto';
import { Request } from 'express';
import { RequestUser } from './types';
export declare class ArticlesController {
    private readonly svc;
    constructor(svc: ArticlesService);
    create(req: Request & {
        user: RequestUser;
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
    update(req: Request & {
        user: RequestUser;
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
    publish(req: Request & {
        user: RequestUser;
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
    unpublish(req: Request & {
        user: RequestUser;
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
    listAllForAdmin(req: Request & {
        user: RequestUser;
    }, q: any): Promise<{
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
    attachImage(req: Request & {
        user: RequestUser;
    }, id: number, file: Express.Multer.File, dto: AttachImageDto): Promise<{
        url: string;
    }>;
    editorUpload(req: Request & {
        user: {
            id: number;
            role?: string;
        };
    }, id: number, file: Express.Multer.File, dto: {
        alt?: string;
        position?: number;
    }): Promise<{
        url: string;
    }>;
    getPublicList(q: any): Promise<{
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
    getByIdForAdmin(req: Request & {
        user: RequestUser;
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
}
