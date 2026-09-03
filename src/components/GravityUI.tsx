import React from 'react';
import {Button, Icon} from '@gravity-ui/uikit';
import {
    ArrowUpRightFromSquare,
    Briefcase,
    Cpu,
    Database,
    LayoutCells,
    LogoGithub,
    LogoMcp,
    Rocket,
    Server,
    ShieldKeyhole,
    Smartphone,
    Wrench,
} from '@gravity-ui/icons';
import {
    siAnsible,
    siApple,
    siAstro,
    siDart,
    siDependabot,
    siDocker,
    siEslint,
    siFigma,
    siFirebase,
    siFlutter,
    siGithubactions,
    siGitlab,
    siGoogleplay,
    siGrafana,
    siGraphql,
    siJest,
    siKubernetes,
    siLighthouse,
    siNestjs,
    siNextdotjs,
    siNginx,
    siNodedotjs,
    siPostgresql,
    siPrettier,
    siPrisma,
    siPrometheus,
    siRabbitmq,
    siReact,
    siRedis,
    siSentry,
    siStorybook,
    siTerraform,
    siTrivy,
    siTypescript,
    siVault,
    siVitest,
    siVuedotjs,
} from 'simple-icons';

const HH_URL = 'https://hh.ru/resume/ebe2b012ff0834a84e0039ed1f6d6b526b584f';

type IconName = 'frontend' | 'backend' | 'devsecops' | 'ai' | 'mobile' | 'quality' | 'github' | 'briefcase' | 'delivery' | 'auth';

const iconMap = {
    frontend: LayoutCells,
    backend: Database,
    devsecops: Server,
    ai: Cpu,
    mobile: Smartphone,
    quality: Wrench,
    github: LogoGithub,
    briefcase: Briefcase,
    delivery: Rocket,
    auth: ShieldKeyhole,
} as const;

const brandMap: Record<string, {path: string; title: string}> = {
    TypeScript: siTypescript,
    React: siReact,
    'Next.js': siNextdotjs,
    Astro: siAstro,
    Vue: siVuedotjs,
    'Node.js': siNodedotjs,
    NestJS: siNestjs,
    GraphQL: siGraphql,
    PostgreSQL: siPostgresql,
    Redis: siRedis,
    RabbitMQ: siRabbitmq,
    Prisma: siPrisma,
    Docker: siDocker,
    Kubernetes: siKubernetes,
    Terraform: siTerraform,
    Ansible: siAnsible,
    Nginx: siNginx,
    'GitHub Actions': siGithubactions,
    'GitLab CI': siGitlab,
    Prometheus: siPrometheus,
    Grafana: siGrafana,
    Sentry: siSentry,
    Trivy: siTrivy,
    Vault: siVault,
    Dependabot: siDependabot,
    Flutter: siFlutter,
    Dart: siDart,
    Firebase: siFirebase,
    iOS: siApple,
    'App Store': siApple,
    'Google Play': siGoogleplay,
    Figma: siFigma,
    Storybook: siStorybook,
    Vitest: siVitest,
    Jest: siJest,
    ESLint: siEslint,
    Prettier: siPrettier,
    Lighthouse: siLighthouse,
};

export function GravityIcon({name, size = 24, className}: {name: IconName; size?: number; className?: string}) {
    return <Icon data={iconMap[name]} size={size} className={className} />;
}

export function HeaderActions({language, languageHref, resumeLabel}: {language: string; languageHref: string; resumeLabel: string}) {
    return (
        <div className="gravity-header-actions">
            <Button href={HH_URL} target="_blank" rel="noreferrer" view="normal" size="m">
                {resumeLabel}
            </Button>
            <Button href={languageHref} view="flat-secondary" size="m">{language}</Button>
        </div>
    );
}

export function GravityLinkButton({href, children}: {href: string; children: React.ReactNode}) {
    return <Button href={href} target="_blank" rel="noreferrer" view="action" size="xl">{children}<Icon data={ArrowUpRightFromSquare} size={16} /></Button>;
}

export function ToolCloud({items}: {items: readonly string[]}) {
    return (
        <ul className="tool-cloud">
            {items.map((name) => {
                const brand = brandMap[name];
                const specialIcon = name === 'MCP' ? LogoMcp : (name === 'OpenAI API' || name === 'Codex') ? Cpu : undefined;
                return (
                    <li key={name} className={brand || specialIcon ? 'tool-cloud_brand' : undefined}>
                        {brand && <svg viewBox="0 0 24 24" aria-hidden="true"><path d={brand.path} /></svg>}
                        {specialIcon && <Icon data={specialIcon} size={18} />}
                        <span>{name}</span>
                    </li>
                );
            })}
        </ul>
    );
}
