create schema linkdump_data;

create table linkdump_data.link (
    l_id serial primary key,
    l_url text not null,
    l_notes text,
    l_created timestamp not null default now (),
    l_last_modified timestamp not null default now ()
);

create unique index on linkdump_data.link (l_url);

create table linkdump_data.tag (
    t_id serial primary key,
    t_name text unique
);

create table linkdump_data.action (
    a_id serial primary key,
    a_name text unique
);

create table linkdump_data.link_tag (
    lt_link_id integer references linkdump_data.link (l_id),
    lt_tag_id integer references linkdump_data.tag (t_id)
);

create table linkdump_data.link_action (
    la_link_id integer references linkdump_data.link (l_id),
    la_action_id integer references linkdump_data.action (a_id)
);

create table linkdump_data.link_data (
    ld_id integer primary key references linkdump_data.link (l_id),
    ld_title text,
    ld_body text,
    ld_raw text
);

