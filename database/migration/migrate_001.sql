create table linkdump_data.link_data (
    ld_id serial primary key,
    ld_link_id integer not null references linkdump_data.link (l_id),
    ld_title text,
    ld_body text,
    ld_raw text,
    ld_created timestamp not null default now()
);
